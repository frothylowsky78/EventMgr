import '../../domain/dining_item.dart';
import '../../domain/transportation_item.dart';
import '../../domain/travel_detail.dart';
import '../api_client.dart';
import '../local_cache.dart';

/// Personalized + offline-cached travel, transportation, and dining (own data only).
class PersonalRepository {
  PersonalRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  // --- Travel ---
  static const _travelKey = 'travel:me';

  TravelDetail? cachedTravel() {
    final map = _cache.getMap(_travelKey);
    return map == null ? null : TravelDetail.fromJson(map);
  }

  Future<TravelDetail?> fetchTravel() async {
    final data = await _api.getData('/me/travel');
    if (data == null) return null;
    final travel = TravelDetail.fromJson((data as Map).cast<String, dynamic>());
    _cache.putJson(_travelKey, travel.toJson());
    return travel;
  }

  // --- Transportation ---
  static const _transportKey = 'transportation:me';

  List<TransportationItem> cachedTransportation() {
    final list = _cache.getList(_transportKey);
    if (list == null) return const [];
    return list
        .map((e) => TransportationItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<TransportationItem>> fetchTransportation() async {
    final data = await _api.getData('/me/transportation');
    final items = (data as List)
        .map((e) => TransportationItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    _cache.putJson(_transportKey, items.map((e) => e.toJson()).toList());
    return items;
  }

  // --- Dining (with personal seating) ---
  static const _diningKey = 'dining:me';

  List<DiningItem> cachedDining() {
    final list = _cache.getList(_diningKey);
    if (list == null) return const [];
    return list
        .map((e) => DiningItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<DiningItem>> fetchDining() async {
    final data = await _api.getData('/me/dining');
    final items = (data as List)
        .map((e) => DiningItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    _cache.putJson(_diningKey, items.map((e) => e.toJson()).toList());
    return items;
  }
}
