import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../application/providers.dart';
import '../../domain/photo.dart';
import '../widgets/refreshable_message.dart';
import '../widgets/moderation.dart';

/// Event photo gallery (spec §4.14): browse approved photos, like, and upload from camera roll
/// or camera. Uploads go to a moderation queue when moderation is enabled.
class GalleryScreen extends ConsumerStatefulWidget {
  const GalleryScreen({super.key});

  @override
  ConsumerState<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends ConsumerState<GalleryScreen> {
  bool _uploading = false;

  Future<void> _pickAndUpload(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, maxWidth: 2400, imageQuality: 85);
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      final bytes = await file.readAsBytes();
      final contentType = _contentType(file.name);
      await ref.read(photosRepositoryProvider).upload(bytes: bytes, contentType: contentType);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Uploaded! It will appear once approved.'),
      ));
      ref.invalidate(galleryProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _showUploadSheet() {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: const Text('Take a photo'),
              onTap: () {
                Navigator.pop(context);
                _pickAndUpload(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from library'),
              onTap: () {
                Navigator.pop(context);
                _pickAndUpload(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  static String _contentType(String name) {
    final n = name.toLowerCase();
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.heic')) return 'image/heic';
    if (n.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(galleryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Photos')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _uploading ? null : _showUploadSheet,
        icon: _uploading
            ? const SizedBox(
                width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.add_a_photo),
        label: Text(_uploading ? 'Uploading…' : 'Upload'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) =>
            Center(child: Text('Could not load the gallery.\n$e', textAlign: TextAlign.center)),
        data: (photos) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(galleryProvider);
              await ref.read(galleryProvider.future);
            },
            // The empty case is inside the indicator on purpose: waiting for a photo to clear
            // moderation is exactly when a guest needs to pull.
            child: photos.isEmpty
                ? const RefreshableMessage('No photos yet — be the first to share!')
                : GridView.builder(
                    padding: const EdgeInsets.all(8),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 6,
                      crossAxisSpacing: 6,
                    ),
                    itemCount: photos.length,
                    itemBuilder: (_, i) => _PhotoTile(photo: photos[i]),
                  ),
          );
        },
      ),
    );
  }
}

class _PhotoTile extends ConsumerWidget {
  const _PhotoTile({required this.photo});
  final Photo photo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _openViewer(context, ref),
      onLongPress: () => _openModerationSheet(context, ref),
      // No Hero here: the viewer is a showDialog, not a PageRoute, so there was never a
      // matching Hero to fly to. Its only effect was to make every tile eligible for a flight
      // during unrelated route transitions, which is exactly how the photos ended up sliding
      // across the screen on a tab change.
      child: photo.thumbnailUrl == null
          ? Container(color: Colors.black12)
          : CachedNetworkImage(
              imageUrl: photo.thumbnailUrl!,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: Colors.black12),
              errorWidget: (_, __, ___) =>
                  const ColoredBox(color: Colors.black12, child: Icon(Icons.broken_image)),
            ),
    );
  }

  /// Guideline 1.2 entry point: every photo can be reported, and its uploader blocked.
  void _openModerationSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.flag_outlined),
              title: const Text('Report photo'),
              onTap: () {
                Navigator.pop(sheetCtx);
                _report(context, ref);
              },
            ),
            ListTile(
              leading: const Icon(Icons.block),
              title: const Text('Block this attendee'),
              onTap: () {
                Navigator.pop(sheetCtx);
                _block(context, ref);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final reason = await pickReportReason(context, 'Report this photo');
    if (reason == null || !context.mounted) return;
    try {
      await ref.read(photosRepositoryProvider).report(photo.id, reason);
      ref.invalidate(galleryProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reported. Our team will take a look.')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not report the photo: $e')));
    }
  }

  Future<void> _block(BuildContext context, WidgetRef ref) async {
    if (photo.uploadedByAttendeeId.isEmpty) return;
    if (!await confirmBlock(context, 'this attendee') || !context.mounted) return;
    try {
      await ref.read(supportRepositoryProvider).block(photo.uploadedByAttendeeId);
      ref.invalidate(galleryProvider);
      ref.invalidate(attendeesProvider);
      ref.invalidate(meProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Blocked. You will no longer see their content.')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not block: $e')));
    }
  }

  void _openViewer(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (photo.imageUrl != null)
              CachedNetworkImage(imageUrl: photo.imageUrl!, fit: BoxFit.contain),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(child: Text(photo.caption.isEmpty ? 'Photo' : photo.caption)),
                  IconButton(
                    icon: const Icon(Icons.favorite_border),
                    onPressed: () async {
                      await ref.read(photosRepositoryProvider).like(photo.id);
                      ref.invalidate(galleryProvider);
                    },
                  ),
                  Text('${photo.likeCount}'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
