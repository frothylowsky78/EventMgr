import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api_client.dart';
import '../data/auth/cognito_service.dart';
import '../data/local_cache.dart';
import '../data/repositories/agenda_repository.dart';
import '../data/repositories/event_repository.dart';
import '../data/repositories/itinerary_repository.dart';
import '../data/repositories/notifications_repository.dart';
import '../data/repositories/personal_repository.dart';
import '../data/repositories/photos_repository.dart';
import '../domain/agenda_item.dart';
import '../domain/dining_item.dart';
import '../domain/event.dart';
import '../domain/itinerary_item.dart';
import '../domain/notification_item.dart';
import '../domain/photo.dart';
import '../domain/transportation_item.dart';
import '../domain/travel_detail.dart';
import 'auth_controller.dart';

/// Overridden in main() with the initialized instance.
final localCacheProvider = Provider<LocalCache>((ref) {
  throw UnimplementedError('localCacheProvider must be overridden in main()');
});

final cognitoServiceProvider = Provider<CognitoService>((ref) => CognitoService());

final apiClientProvider =
    Provider<ApiClient>((ref) => ApiClient(ref.watch(cognitoServiceProvider)));

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(cognitoServiceProvider));
});

final eventRepositoryProvider = Provider<EventRepository>(
  (ref) => EventRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
);
final agendaRepositoryProvider = Provider<AgendaRepository>(
  (ref) => AgendaRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
);
final itineraryRepositoryProvider = Provider<ItineraryRepository>(
  (ref) => ItineraryRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
);
final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => NotificationsRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
);
final personalRepositoryProvider = Provider<PersonalRepository>(
  (ref) => PersonalRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
);
final photosRepositoryProvider = Provider<PhotosRepository>(
  (ref) => PhotosRepository(ref.watch(apiClientProvider)),
);

/// Stale-while-revalidate: try the network; on failure fall back to the offline cache.
final eventProvider = FutureProvider<EventProfile>((ref) async {
  final repo = ref.watch(eventRepositoryProvider);
  try {
    return await repo.fetch();
  } catch (e) {
    final cached = repo.cached();
    if (cached != null) return cached;
    rethrow;
  }
});

final agendaProvider = FutureProvider<List<AgendaItem>>((ref) async {
  final repo = ref.watch(agendaRepositoryProvider);
  try {
    return await repo.fetch();
  } catch (e) {
    final cached = repo.cached();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

final itineraryProvider = FutureProvider<List<ItineraryItem>>((ref) async {
  final repo = ref.watch(itineraryRepositoryProvider);
  try {
    return await repo.fetch();
  } catch (e) {
    final cached = repo.cached();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

final notificationsProvider = FutureProvider<NotificationCenter>((ref) async {
  final repo = ref.watch(notificationsRepositoryProvider);
  try {
    return await repo.fetch();
  } catch (e) {
    final cached = repo.cached();
    if (cached.items.isNotEmpty) return cached;
    rethrow;
  }
});

final travelProvider = FutureProvider<TravelDetail?>((ref) async {
  final repo = ref.watch(personalRepositoryProvider);
  try {
    return await repo.fetchTravel();
  } catch (e) {
    final cached = repo.cachedTravel();
    if (cached != null) return cached;
    rethrow;
  }
});

final transportationProvider = FutureProvider<List<TransportationItem>>((ref) async {
  final repo = ref.watch(personalRepositoryProvider);
  try {
    return await repo.fetchTransportation();
  } catch (e) {
    final cached = repo.cachedTransportation();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

final diningProvider = FutureProvider<List<DiningItem>>((ref) async {
  final repo = ref.watch(personalRepositoryProvider);
  try {
    return await repo.fetchDining();
  } catch (e) {
    final cached = repo.cachedDining();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

final galleryProvider = FutureProvider<List<Photo>>((ref) async {
  return ref.watch(photosRepositoryProvider).fetch();
});
