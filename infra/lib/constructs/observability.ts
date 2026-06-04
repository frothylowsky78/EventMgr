import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvConfig } from '../config';

interface ObservabilityProps {
  config: EnvConfig;
  httpApi: apigw.HttpApi;
  /** Async functions whose errors + DLQ depth we watch. */
  asyncFunctions: { name: string; fn: NodejsFunction }[];
}

/**
 * CloudWatch alarms + dashboard (spec §18.10). Alarms publish to an SNS topic that ops can
 * subscribe to (email via `--context alarmEmail=`). Covers API 5xx + latency, async Lambda
 * errors, and dead-letter queue depth (failed photo processing / scheduled sends).
 */
export class Observability extends Construct {
  readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: ObservabilityProps) {
    super(scope, id);
    const { config, httpApi, asyncFunctions } = props;

    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `eventmgr-alarms-${config.envName}`,
    });
    if (config.alarmEmail) {
      this.alarmTopic.addSubscription(new subs.EmailSubscription(config.alarmEmail));
    }
    const action = new cwActions.SnsAction(this.alarmTopic);

    const apiServerErrors = httpApi.metricServerError({ period: Duration.minutes(5) });
    const apiLatencyP95 = httpApi.metricLatency({ period: Duration.minutes(5), statistic: 'p95' });

    const alarms: cw.Alarm[] = [
      new cw.Alarm(this, 'Api5xxAlarm', {
        alarmName: `eventmgr-${config.envName}-api-5xx`,
        metric: apiServerErrors,
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'API Gateway 5xx responses elevated',
      }),
      new cw.Alarm(this, 'ApiLatencyAlarm', {
        alarmName: `eventmgr-${config.envName}-api-latency-p95`,
        metric: apiLatencyP95,
        threshold: 3000, // ms
        evaluationPeriods: 3,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'API p95 latency above 3s',
      }),
    ];

    for (const { name, fn } of asyncFunctions) {
      alarms.push(
        new cw.Alarm(this, `${name}ErrorsAlarm`, {
          alarmName: `eventmgr-${config.envName}-${name}-errors`,
          metric: fn.metricErrors({ period: Duration.minutes(5) }),
          threshold: 1,
          evaluationPeriods: 1,
          comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cw.TreatMissingData.NOT_BREACHING,
          alarmDescription: `${name} Lambda errors`,
        })
      );
      // Anything that reaches the DLQ is a hard failure worth paging on.
      const dlq = fn.deadLetterQueue;
      if (dlq) {
        alarms.push(
          new cw.Alarm(this, `${name}DlqAlarm`, {
            alarmName: `eventmgr-${config.envName}-${name}-dlq`,
            metric: dlq.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5) }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cw.TreatMissingData.NOT_BREACHING,
            alarmDescription: `${name} dead-letter queue has messages`,
          })
        );
      }
    }

    alarms.forEach((a) => a.addAlarmAction(action));

    const dashboard = new cw.Dashboard(this, 'Dashboard', {
      dashboardName: `EventMgr-${config.envName}`,
    });
    dashboard.addWidgets(
      new cw.GraphWidget({
        title: 'API requests & errors',
        left: [httpApi.metricCount(), httpApi.metricClientError(), apiServerErrors],
        width: 12,
      }),
      new cw.GraphWidget({ title: 'API latency (p95)', left: [apiLatencyP95], width: 12 })
    );
    dashboard.addWidgets(
      new cw.GraphWidget({
        title: 'Async function errors',
        left: asyncFunctions.map(({ fn }) => fn.metricErrors()),
        width: 12,
      }),
      new cw.AlarmStatusWidget({ title: 'Alarms', alarms, width: 12 })
    );
  }
}
