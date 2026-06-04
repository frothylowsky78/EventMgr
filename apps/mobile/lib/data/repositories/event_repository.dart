import '../../core/config.dart';
import '../../domain/event.dart';
import '../api_client.dart';
import '../local_cache.dart';

/// Loads the event profile, caching it for offline use.
class EventRepository {
  EventRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  String get _key => 'event:${AppConfig.eventId}';

  /// Cached value, if any (instant first paint / offline).
  EventProfile? cached() {
    final map = _cache.getMap(_key);
    return map == null ? null : EventProfile.fromJson(map);
  }

  /// Fetches from the network and refreshes the cache.
  Future<EventProfile> fetch() async {
    final data = await _api.getData('/events/${AppConfig.eventId}');
    final event = EventProfile.fromJson((data as Map).cast<String, dynamic>());
    _cache.putJson(_key, event.toJson());
    return event;
  }
}
