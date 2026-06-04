import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';

/// Feedback form (spec §4.16). Defaults to overall event feedback; agenda/dining detail can
/// open it for a specific item by passing [type], [targetId], and [title].
class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({
    super.key,
    this.type = 'event',
    this.targetId = 'event',
    this.title = 'Event feedback',
  });

  final String type;
  final String targetId;
  final String title;

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  int _rating = 0;
  bool? _wouldRecommend;
  bool _anonymous = false;
  final _comments = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _comments.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Please tap a star rating first.')));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(supportRepositoryProvider).submitFeedback(
            type: widget.type,
            targetId: widget.targetId,
            rating: _rating,
            comments: _comments.text.trim(),
            wouldRecommend: _wouldRecommend,
            anonymous: _anonymous,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Thanks for your feedback!')));
      Navigator.of(context).maybePop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('How was it?', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  iconSize: 40,
                  icon: Icon(i <= _rating ? Icons.star : Icons.star_border,
                      color: scheme.secondary),
                  onPressed: () => setState(() => _rating = i),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _comments,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(
              labelText: 'Comments (optional)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text('Would you recommend?'),
              const Spacer(),
              ChoiceChip(
                label: const Text('Yes'),
                selected: _wouldRecommend == true,
                onSelected: (_) => setState(() => _wouldRecommend = true),
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('No'),
                selected: _wouldRecommend == false,
                onSelected: (_) => setState(() => _wouldRecommend = false),
              ),
            ],
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Submit anonymously'),
            value: _anonymous,
            onChanged: (v) => setState(() => _anonymous = v),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Submitting…' : 'Submit feedback'),
          ),
        ],
      ),
    );
  }
}
