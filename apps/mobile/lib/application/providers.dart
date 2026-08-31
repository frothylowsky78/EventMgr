import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api_client.dart';
import '../data/auth/cognito_service.dart';
import '../data/local_cache.dart';
import '../data/repositories/agenda_repository.dart';
import '../data/repositories/event_repository.dart';
import '../data/repositories/itinerary_repository.dart';
import '../data/repositories/messages_repository.dart';
import '../data/repositories/notifications_repository.dart';
import '../data/repositories/content_repository.dart';
import '../data/repositories/personal_repository.dart';
import '../data/repositories/photos_repository.dart';
import '../data/repositories/support_repository.dart';
import '../domain/agenda_item.dart';
import '../domain/attendee_card.dart';
import '../domain/dining_item.dart';
import '../domain/event.dart';
import '../domain/faq_item.dart';
import '../domain/help.dart';
import '../domain/itinerary_item.dart';
import '../domain/map_location.dart';
import '../domain/message.dart';
import '../domain/me.dart';
import '../domain/notification_item.dart';
import '../domain/photo.dart';
import '../domain/transportation_item.dart';
import '../domain/travel_detail.dart';
import '../domain/weather.dart';
import 'auth_controller.dart';

/// Overridden in main() with the initialized instance.
final localCacheProvider = Provider<LocalCache>((ref) {
  throw UnimplementedError('localCacheProvider must be overridden in main()');
});

final cognitoServiceProvider = Provider<CognitoService>((ref) => CognitoService());

final apiClientProvider = Provider<ApiClient>((ref) {
  // Rebuild whenever the user becomes signed in (or signs out). Every repository watches this
  // provider and every data FutureProvider watches a repository, so one dependency here makes
  // the whole tree re-fetch after login. Without it, the fetches that ran while signed out kept
  // their 401 error state until the app was restarted — the "nothing loads after sign-in" bug.
  ref.watch(authControllerProvider.select((s) => s.status == AuthStatus.signedIn));
  return ApiClient(ref.watch(cognitoServiceProvider));
});

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
final messagesRepositoryProvider = Provider<MessagesRepository>(
  (ref) => MessagesRepository(ref.watch(apiClientProvider)),
);
final contentRepositoryProvider = Provider<ContentRepository>(
  (ref) => ContentRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
);
final supportRepositoryProvider = Provider<SupportRepository>(
  (ref) => SupportRepository(ref.watch(apiClientProvider), ref.watch(localCacheProvider)),
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

final faqProvider = FutureProvider<List<FaqItem>>((ref) async {
  final repo = ref.watch(contentRepositoryProvider);
  try {
    return await repo.fetchFaq();
  } catch (e) {
    final cached = repo.cachedFaq();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

/// Blocked attendees, resolved to names for the unblock screen. Depends on [meProvider] for
/// the id list, so unblocking and invalidating me re-runs this automatically.
final blockedAttendeesProvider = FutureProvider<List<AttendeeCard>>((ref) async {
  final me = await ref.watch(meProvider.future);
  final ids = me.blockedAttendeeIds.toSet();
  if (ids.isEmpty) return const [];
  final all = await ref.watch(contentRepositoryProvider).fetchAttendeesIncludingBlocked();
  return all.where((c) => ids.contains(c.id)).toList();
});

final attendeesProvider = FutureProvider<List<AttendeeCard>>((ref) async {
  final repo = ref.watch(contentRepositoryProvider);
  try {
    return await repo.fetchAttendees();
  } catch (e) {
    final cached = repo.cachedAttendees();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

final weatherProvider = FutureProvider<WeatherInfo>((ref) async {
  final repo = ref.watch(contentRepositoryProvider);
  try {
    return await repo.fetchWeather();
  } catch (e) {
    final cached = repo.cachedWeather();
    if (cached != null) return cached;
    rethrow;
  }
});

final meProvider = FutureProvider<AttendeeMe>((ref) async {
  final repo = ref.watch(supportRepositoryProvider);
  try {
    return await repo.fetchMe();
  } catch (e) {
    final cached = repo.cachedMe();
    if (cached != null) return cached;
    rethrow;
  }
});

final mapsProvider = FutureProvider<List<MapLocation>>((ref) async {
  final repo = ref.watch(contentRepositoryProvider);
  try {
    return await repo.fetchMaps();
  } catch (e) {
    final cached = repo.cachedMaps();
    if (cached.isNotEmpty) return cached;
    rethrow;
  }
});

final helpProvider = FutureProvider<HelpContent>((ref) async {
  final repo = ref.watch(supportRepositoryProvider);
  try {
    return await repo.fetchHelp();
  } catch (e) {
    final cached = repo.cachedHelp();
    if (cached != null) return cached;
    rethrow;
  }
});

// --- Messaging (CF-6/CF-7). Polled: refreshed on foreground, and every 30s inside a thread.
// No cache fallback — a stale conversation is worse than an empty one.

final conversationsProvider = FutureProvider<List<Conversation>>((ref) async {
  return ref.watch(messagesRepositoryProvider).conversations();
});

final conversationMessagesProvider =
    FutureProvider.family<List<Message>, String>((ref, conversationId) async {
  return ref.watch(messagesRepositoryProvider).messages(conversationId);
});

/// Drives the unread badge. Returns 0 rather than throwing so a transient failure never
/// blocks the shell chrome.
final unreadCountProvider = FutureProvider<int>((ref) async {
  try {
    return await ref.watch(messagesRepositoryProvider).unreadCount();
  } catch (_) {
    return 0;
  }
});
