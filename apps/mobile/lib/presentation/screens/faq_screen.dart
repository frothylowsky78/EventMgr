import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';
import '../../domain/faq_item.dart';

class FaqScreen extends ConsumerStatefulWidget {
  const FaqScreen({super.key});

  @override
  ConsumerState<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends ConsumerState<FaqScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(faqProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('FAQ')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search FAQs',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v.trim()),
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Could not load FAQs.\n$e',
                  textAlign: TextAlign.center)),
              data: (items) {
                final filtered = _query.isEmpty
                    ? items
                    : items.where((f) => f.matches(_query)).toList();
                if (filtered.isEmpty) {
                  return const Center(child: Text('No matching FAQs.'));
                }
                return ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [for (final f in filtered) _FaqTile(item: f)],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  const _FaqTile({required this.item});
  final FaqItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        shape: const Border(),
        leading: item.featured
            ? Icon(Icons.star, color: Theme.of(context).colorScheme.secondary)
            : const Icon(Icons.help_outline),
        title: Text(item.question,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(item.categoryLabel,
            style: const TextStyle(fontSize: 12, color: Colors.black54)),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        expandedAlignment: Alignment.centerLeft,
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [Text(item.answer)],
      ),
    );
  }
}
