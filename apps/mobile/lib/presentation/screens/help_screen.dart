import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../application/providers.dart';
import '../../domain/help.dart';

class HelpScreen extends ConsumerWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(helpProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Help')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openRequestForm(context, ref),
        icon: const Icon(Icons.support_agent),
        label: const Text('Request help'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load help.\n$e',
            textAlign: TextAlign.center)),
        data: (help) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (help.emergencyText.isNotEmpty)
              Card(
                color: Colors.red.shade50,
                child: ListTile(
                  leading: const Icon(Icons.emergency, color: Colors.red),
                  title: const Text('Emergency'),
                  subtitle: Text(help.emergencyText),
                ),
              ),
            const SizedBox(height: 8),
            const _EventContacts(),
            Text('Contacts', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final c in help.contacts) _ContactTile(contact: c),
            if (help.topics.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('Common topics', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              for (final t in help.topics)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ExpansionTile(
                    shape: const Border(),
                    title: Text(t.title),
                    childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    expandedAlignment: Alignment.centerLeft,
                    children: [Text(t.body)],
                  ),
                ),
            ],
            if (help.lostAndFound.isNotEmpty) ...[
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.inventory_2_outlined),
                  title: const Text('Lost & found'),
                  subtitle: Text(help.lostAndFound),
                ),
              ),
            ],
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  void _openRequestForm(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _HelpRequestSheet(ref: ref),
    );
  }
}

class _ContactTile extends StatelessWidget {
  const _ContactTile({required this.contact});
  final HelpContact contact;

  Future<void> _launch(String scheme, String value) async {
    final uri = Uri(scheme: scheme, path: value);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final hasPhone = (contact.phone ?? '').isNotEmpty;
    final hasEmail = (contact.email ?? '').isNotEmpty;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(contact.label, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text([contact.phone, contact.email, contact.note]
            .where((s) => (s ?? '').isNotEmpty)
            .join('\n')),
        isThreeLine: hasPhone && hasEmail,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasPhone)
              IconButton(
                icon: const Icon(Icons.call),
                onPressed: () => _launch('tel', contact.phone!),
              ),
            if (hasEmail)
              IconButton(
                icon: const Icon(Icons.email_outlined),
                onPressed: () => _launch('mailto', contact.email!),
              ),
          ],
        ),
      ),
    );
  }
}

class _HelpRequestSheet extends StatefulWidget {
  const _HelpRequestSheet({required this.ref});
  final WidgetRef ref;

  @override
  State<_HelpRequestSheet> createState() => _HelpRequestSheetState();
}

class _HelpRequestSheetState extends State<_HelpRequestSheet> {
  final _message = TextEditingController();
  String _category = 'General';
  String _urgency = 'normal';
  bool _busy = false;

  static const _categories = ['General', 'Travel', 'Dining', 'Room', 'Medical', 'App support'];

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_message.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await widget.ref.read(supportRepositoryProvider).submitHelpRequest(
            category: _category,
            message: _message.text.trim(),
            urgency: _urgency,
          );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Help request sent — staff will follow up.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16, right: 16, top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Request help', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: _categories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) => setState(() => _category = v ?? 'General'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _urgency,
                  decoration: const InputDecoration(labelText: 'Urgency'),
                  items: const [
                    DropdownMenuItem(value: 'low', child: Text('Low')),
                    DropdownMenuItem(value: 'normal', child: Text('Normal')),
                    DropdownMenuItem(value: 'high', child: Text('High')),
                  ],
                  onChanged: (v) => setState(() => _urgency = v ?? 'normal'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _message,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'How can we help?',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Sending…' : 'Send request'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Named event contacts from the event profile (CF-4). Tapping a row calls or emails via
/// url_launcher; the Android <queries> block and iOS LSApplicationQueriesSchemes already
/// declare tel:/mailto:. Renders nothing when no contacts are configured.
class _EventContacts extends ConsumerWidget {
  const _EventContacts();

  Future<void> _launch(String scheme, String value) async {
    final uri = Uri(scheme: scheme, path: value);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contacts = ref.watch(eventProvider).valueOrNull?.eventContacts ?? const [];
    if (contacts.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Event team', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        for (final c in contacts)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text([c.role, c.phone, c.email].where((s) => s.isNotEmpty).join(' · ')),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (c.phone.isNotEmpty)
                    IconButton(
                      tooltip: 'Call ${c.name}',
                      icon: const Icon(Icons.phone_outlined),
                      onPressed: () => _launch('tel', c.phone),
                    ),
                  if (c.email.isNotEmpty)
                    IconButton(
                      tooltip: 'Email ${c.name}',
                      icon: const Icon(Icons.mail_outline),
                      onPressed: () => _launch('mailto', c.email),
                    ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }
}
