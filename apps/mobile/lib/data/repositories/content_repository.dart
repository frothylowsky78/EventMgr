import '../../core/config.dart';
import '../../domain/attendee_card.dart';
import '../../domain/faq_item.dart';
import '../../domain/weather.dart';
import '../api_client.dart';
import '../local_cache.dart';

/// Read-only content modules (FAQ, yearbook, weather) with offline cache.
class ContentRepository {
  ContentRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  String _evt(String suffix) => '$suffix:${AppConfig.eventId}';

  // --- FAQ ---
  List<FaqItem> cachedFaq() =>
      (_cache.getList(_evt('faq')) ?? const [])
          .map((e) => FaqItem.fromJson((e as Map).cast<String, dynamic>()))
          .toList();

  Future<List<FaqItem>> fetchFaq() async {
    final data = await _api.getData('/events/${AppConfig.eventId}/faq');
    final items = (data as List)
        .map((e) => FaqItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    _cache.putJson(_evt('faq'), items.map((e) => e.toJson()).toList());
    return items;
  }

  // --- Yearbook / attendees ---
  List<AttendeeCard> cachedAttendees() =>
      (_cache.getList(_evt('attendees')) ?? const [])
          .map((e) => AttendeeCard.fromJson((e as Map).cast<String, dynamic>()))
          .toList();

  Future<List<AttendeeCard>> fetchAttendees() async {
    final data = await _api.getData('/events/${AppConfig.eventId}/attendees');
    final items = (data as List)
        .map((e) => AttendeeCard.fromJson((e as Map).cast<String, dynamic>()))
        .toList()
      ..sort((a, b) => a.lastName.compareTo(b.lastName));
    _cache.putJson(_evt('attendees'), items.map((e) => e.toJson()).toList());
    return items;
  }

  // --- Weather ---
  WeatherInfo? cachedWeather() {
    final map = _cache.getMap(_evt('weather'));
    return map == null ? null : WeatherInfo.fromJson(map);
  }

  Future<WeatherInfo> fetchWeather() async {
    final data = await _api.getData('/events/${AppConfig.eventId}/weather');
    final w = WeatherInfo.fromJson((data as Map).cast<String, dynamic>());
    _cache.putJson(_evt('weather'), w.toJson());
    return w;
  }
}
