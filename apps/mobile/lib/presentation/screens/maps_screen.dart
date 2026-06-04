import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../application/providers.dart';
import '../../domain/map_location.dart';

/// Maps & navigation (spec §4.12): static map images + external nav links.
class MapsScreen extends ConsumerWidget {
  const MapsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mapsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Maps')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load maps.\n$e',
            textAlign: TextAlign.center)),
        data: (maps) {
          if (maps.isEmpty) {
            return const Center(child: Text('Maps coming soon.'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(mapsProvider);
              await ref.read(mapsProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [for (final m in maps) _MapCard(map: m)],
            ),
          );
        },
      ),
    );
  }
}

class _MapCard extends StatelessWidget {
  const _MapCard({required this.map});
  final MapLocation map;

  Future<void> _openExternal() async {
    final Uri uri;
    if (map.hasCoordinates) {
      uri = Uri.parse('https://maps.google.com/?q=${map.latitude},${map.longitude}');
    } else if (map.address.isNotEmpty) {
      uri = Uri.parse('https://maps.google.com/?q=${Uri.encodeComponent(map.address)}');
    } else {
      return;
    }
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canNavigate = map.hasCoordinates || map.address.isNotEmpty;
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (map.imageUrl.isNotEmpty)
            CachedNetworkImage(
              imageUrl: map.imageUrl,
              fit: BoxFit.cover,
              width: double.infinity,
              height: 180,
              placeholder: (_, __) => Container(height: 180, color: Colors.black12),
              errorWidget: (_, __, ___) =>
                  Container(height: 180, color: Colors.black12, child: const Icon(Icons.map)),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(map.title, style: Theme.of(context).textTheme.titleMedium),
                Text(map.typeLabel,
                    style: const TextStyle(fontSize: 12, color: Colors.black54)),
                if (map.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(map.description),
                ],
                if (map.pins.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  for (final p in map.pins)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.place, size: 16),
                        const SizedBox(width: 6),
                        Expanded(child: Text(
                          p.note == null ? p.label : '${p.label} — ${p.note}',
                          style: const TextStyle(fontSize: 13),
                        )),
                      ],
                    ),
                ],
                if (canNavigate) ...[
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _openExternal,
                    icon: const Icon(Icons.directions),
                    label: const Text('Open in Maps'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
