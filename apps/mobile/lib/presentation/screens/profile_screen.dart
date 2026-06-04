import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../application/providers.dart';
import '../../domain/me.dart';

/// Profile self-service (spec §4.1, §4.8): edit your own fields + privacy + profile photo.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(meProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load profile.\n$e',
            textAlign: TextAlign.center)),
        data: (me) => _ProfileForm(me: me),
      ),
    );
  }
}

class _ProfileForm extends ConsumerStatefulWidget {
  const _ProfileForm({required this.me});
  final AttendeeMe me;

  @override
  ConsumerState<_ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends ConsumerState<_ProfileForm> {
  late final _phone = TextEditingController(text: widget.me.phone);
  late final _company = TextEditingController(text: widget.me.company);
  late final _title = TextEditingController(text: widget.me.title);
  late final _city = TextEditingController(text: widget.me.city);
  late final _accessibility = TextEditingController(text: widget.me.accessibilityNeeds);
  late bool _directoryVisible = widget.me.directoryVisible;
  late bool _contactSharing = widget.me.contactSharingOptIn;
  bool _busy = false;
  bool _uploading = false;

  @override
  void dispose() {
    for (final c in [_phone, _company, _title, _city, _accessibility]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref.read(supportRepositoryProvider).updateProfile({
        'phone': _phone.text.trim(),
        'company': _company.text.trim(),
        'title': _title.text.trim(),
        'city': _city.text.trim(),
        'accessibilityNeeds': _accessibility.text.trim(),
        'directoryVisible': _directoryVisible,
        'contactSharingOptIn': _contactSharing,
      });
      ref.invalidate(meProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Profile saved.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _uploadPhoto() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final bytes = await file.readAsBytes();
      final ct = file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      await ref.read(supportRepositoryProvider).uploadProfilePhoto(bytes: bytes, contentType: ct);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Photo uploaded.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initials = '${widget.me.firstName.isNotEmpty ? widget.me.firstName[0] : ''}'
        '${widget.me.lastName.isNotEmpty ? widget.me.lastName[0] : ''}';
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 44,
                backgroundColor: scheme.primary.withOpacity(0.12),
                foregroundColor: scheme.primary,
                child: Text(initials.toUpperCase(),
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 8),
              Text('${widget.me.firstName} ${widget.me.lastName}',
                  style: Theme.of(context).textTheme.titleMedium),
              TextButton.icon(
                onPressed: _uploading ? null : _uploadPhoto,
                icon: const Icon(Icons.photo_camera),
                label: Text(_uploading ? 'Uploading…' : 'Change photo'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        _field('Phone', _phone),
        _field('Company', _company),
        _field('Title', _title),
        _field('City', _city),
        _field('Accessibility needs', _accessibility),
        const SizedBox(height: 8),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Show me in the attendee directory'),
          value: _directoryVisible,
          onChanged: (v) => setState(() => _directoryVisible = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Allow contact sharing'),
          subtitle: const Text('Let other attendees see your contact details'),
          value: _contactSharing,
          onChanged: (v) => setState(() => _contactSharing = v),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: Text(_busy ? 'Saving…' : 'Save changes'),
        ),
      ],
    );
  }

  Widget _field(String label, TextEditingController controller) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: controller,
          decoration: InputDecoration(labelText: label),
        ),
      );
}
