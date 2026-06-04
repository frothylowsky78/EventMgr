import '../../domain/itinerary_item.dart';
import '../api_client.dart';
import '../local_cache.dart';

/// Loads the authenticated attendee's personal itinerary (own data only — enforced server-side).
class ItineraryRepository {
  ItineraryRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  static const _key = 'itinerary:me';

  List<ItineraryItem> cached() {
    final list = _cache.getList(_key);
    if (list == null) return const [];
    return list
        .map((e) => ItineraryItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<ItineraryItem>> fetch() async {
    final data = await _api.getData('/me/itinerary');
    final items = (data as List)
        .map((e) => ItineraryItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList()
      ..sort((a, b) => a.startDateTime.compareTo(b.startDateTime));
    _cache.putJson(_key, items.map((e) => e.toJson()).toList());
    return items;
  }

  Future<void> clear() => _cache.clear();
}
