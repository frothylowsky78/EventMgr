import '../../core/config.dart';
import '../../domain/agenda_item.dart';
import '../api_client.dart';
import '../local_cache.dart';

class AgendaRepository {
  AgendaRepository(this._api, this._cache);
  final ApiClient _api;
  final LocalCache _cache;

  String get _key => 'agenda:${AppConfig.eventId}';

  List<AgendaItem> cached() {
    final list = _cache.getList(_key);
    if (list == null) return const [];
    return list
        .map((e) => AgendaItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<AgendaItem>> fetch() async {
    final data = await _api.getData('/events/${AppConfig.eventId}/agenda');
    final items = (data as List)
        .map((e) => AgendaItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList()
      ..sort((a, b) =>
          '${a.date} ${a.startTime}'.compareTo('${b.date} ${b.startTime}'));
    _cache.putJson(_key, items.map((e) => e.toJson()).toList());
    return items;
  }
}
