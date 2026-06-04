import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';

/// Offline cache for key event data (agenda, itinerary, event profile, …).
/// Repositories follow stale-while-revalidate: read cache first, then refresh from network
/// and overwrite. JSON is stored as strings so we avoid Hive type adapters/codegen.
class LocalCache {
  static const _boxName = 'eventmgr_cache';
  late final Box<String> _box;

  Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox<String>(_boxName);
  }

  void putJson(String key, Object value) {
    _box.put(key, jsonEncode(value));
  }

  Map<String, dynamic>? getMap(String key) {
    final raw = _box.get(key);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  List<dynamic>? getList(String key) {
    final raw = _box.get(key);
    if (raw == null) return null;
    return jsonDecode(raw) as List<dynamic>;
  }

  Future<void> clear() => _box.clear();
}
