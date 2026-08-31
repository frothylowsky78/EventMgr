import 'package:flutter/material.dart';

/// A centered message that still scrolls.
///
/// RefreshIndicator only fires when it has a scrollable descendant, so the usual
/// `Center(child: Text('Nothing yet'))` makes pull-to-refresh impossible at exactly the moment
/// the guest most wants it — an empty gallery waiting on a photo to be approved, an agenda
/// that has not been published yet. This keeps the same look and stays pullable.
class RefreshableMessage extends StatelessWidget {
  const RefreshableMessage(this.message, {super.key});
  final String message;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        // Always scrollable: without this the viewport is not overscrollable when the content
        // is shorter than the screen, and the pull gesture is swallowed.
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(message, textAlign: TextAlign.center),
            ),
          ),
        ),
      ),
    );
  }
}
