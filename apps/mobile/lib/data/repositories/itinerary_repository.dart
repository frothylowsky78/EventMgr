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

  /// POST /me/itinerary — add an agenda session to your own itinerary.
  /// The server copies the times from the agenda item and is idempotent, so a repeat add
  /// returns the existing item rather than a duplicate.
  Future<ItineraryItem> add(String agendaItemId) async {
    final data = await _api.postData('/me/itinerary', {'agendaItemId': agendaItemId});
    return ItineraryItem.fromJson((data as Map).cast<String, dynamic>());
  }

  /// DELETE /me/itinerary/{itemId} — only items the attendee added themselves; the server
  /// refuses admin-assigned ones.
  Future<void> remove(String itemId) => _api.deleteData('/me/itinerary/$itemId');

  Future<void> clear() => _cache.clear();
}
