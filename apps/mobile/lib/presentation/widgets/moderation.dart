import 'package:flutter/material.dart';

/// Shared report/block prompts (App Store guideline 1.2). One copy so the gallery, a
/// conversation and the directory all ask the same question the same way.

/// Wire value -> label. Must match `contentReportSchema` in services/api/src/lib/validation.ts.
const reportReasons = <String, String>{
  'inappropriate': 'Inappropriate content',
  'spam': 'Spam or misleading',
  'harassment': 'Harassment or bullying',
  'other': 'Something else',
};

/// Reason picker. Returns the wire value, or null if the guest backed out.
Future<String?> pickReportReason(BuildContext context, String title) {
  return showModalBottomSheet<String>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(title, style: Theme.of(ctx).textTheme.titleMedium),
          ),
          for (final entry in reportReasons.entries)
            ListTile(
              title: Text(entry.value),
              onTap: () => Navigator.of(ctx).pop(entry.key),
            ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}

/// Blocking is reversible but not from inside the app, so it always confirms first.
Future<bool> confirmBlock(BuildContext context, String name) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Block $name?'),
      content: const Text(
        "You won't see their photos or find them in the directory, and neither of you can "
        'message the other.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Block')),
      ],
    ),
  );
  return ok ?? false;
}
