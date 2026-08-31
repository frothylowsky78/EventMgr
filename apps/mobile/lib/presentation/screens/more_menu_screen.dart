import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/auth_controller.dart';
import '../../application/providers.dart';

/// The "More" tab (spec §7 More menu). Links to the secondary modules; the ones not yet
/// built show a polished "coming soon" so the menu always looks complete.
class MoreMenuScreen extends ConsumerWidget {
  const MoreMenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = <_MoreEntry>[
      const _MoreEntry('My Profile', Icons.person_outline, route: '/profile'),
      const _MoreEntry('Transportation', Icons.directions_bus, route: '/transportation'),
      const _MoreEntry('Dining', Icons.restaurant, route: '/dining'),
      const _MoreEntry('Messages', Icons.forum_outlined, route: '/messages'),
      const _MoreEntry('Notifications', Icons.notifications, route: '/notifications'),
      const _MoreEntry('Attendees / Yearbook', Icons.people_outline, route: '/attendees'),
      const _MoreEntry('Blocked attendees', Icons.block, route: '/blocked'),
      const _MoreEntry('Weather', Icons.wb_sunny_outlined, route: '/weather'),
      const _MoreEntry('FAQ', Icons.help_outline, route: '/faq'),
      const _MoreEntry('Registration', Icons.how_to_reg_outlined, route: '/registration'),
      const _MoreEntry('Help', Icons.support_agent, route: '/help'),
      const _MoreEntry('Feedback', Icons.rate_review_outlined, route: '/feedback'),
      const _MoreEntry('Maps', Icons.map_outlined, route: '/maps'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        children: [
          for (final e in entries)
            ListTile(
              leading: Icon(e.icon, color: Theme.of(context).colorScheme.primary),
              title: Text(e.label),
              trailing: const Icon(Icons.chevron_right),
              onTap: e.route != null
                  ? () => context.push(e.route!)
                  : () => ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('${e.label} coming soon')),
                      ),
            ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Sign out'),
            onTap: () => ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
      ),
    );
  }
}

class _MoreEntry {
  final String label;
  final IconData icon;
  final String? route;
  const _MoreEntry(this.label, this.icon, {this.route});
}
