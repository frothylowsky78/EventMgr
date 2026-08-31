import 'package:flutter_test/flutter_test.dart';
import 'package:eventmgr_mobile/domain/agenda_item.dart';
import 'package:eventmgr_mobile/domain/itinerary_item.dart';

void main() {
  test('AgendaItem.fromJson parses core fields and defaults', () {
    final item = AgendaItem.fromJson({
      'id': 'agenda_001',
      'eventId': 'event_001',
      'title': 'Welcome Reception',
      'date': '2026-09-12',
      'startTime': '18:00',
      'endTime': '20:00',
      'category': 'meal',
      'required': true,
    });

    expect(item.id, 'agenda_001');
    expect(item.title, 'Welcome Reception');
    expect(item.required, isTrue);
    expect(item.categoryLabel, 'meal');
    expect(item.reminderEnabled, isTrue); // default
  });

  test('ItineraryItem parses ISO datetimes', () {
    final it = ItineraryItem.fromJson({
      'id': 'itinerary_001',
      'attendeeId': 'attendee_001',
      'startDateTime': '2026-09-12T18:00:00-07:00',
      'endDateTime': '2026-09-12T20:00:00-07:00',
    });
    expect(it.start.isBefore(it.end!), isTrue);
  });

  group('itinerary times render in the device timezone', () {
    // Regression: DateTime.parse returns a UTC DateTime for a string with an offset, and
    // DateFormat then printed those UTC fields verbatim — a 6:00 PM Pacific item showed as
    // 1:00 AM the next day, on the My Itinerary heading and the Home "Up next" card.
    // Asserted against a fixed instant so the test holds in any machine timezone.
    final item = ItineraryItem.fromJson({
      'id': 'itinerary_001',
      'attendeeId': 'attendee_001',
      'startDateTime': '2026-09-12T18:00:00-07:00',
      'endDateTime': '2026-09-12T20:00:00-07:00',
    });

    test('start is a local DateTime, not UTC', () {
      expect(item.start.isUtc, isFalse);
    });

    test('start still points at the right instant', () {
      expect(item.start.toUtc(), DateTime.utc(2026, 9, 13, 1));
    });

    test('end is converted the same way', () {
      expect(item.end!.isUtc, isFalse);
      expect(item.end!.toUtc(), DateTime.utc(2026, 9, 13, 3));
    });

    test('a null end stays null', () {
      final noEnd = ItineraryItem.fromJson({
        'id': 'i2',
        'attendeeId': 'a1',
        'startDateTime': '2026-09-12T18:00:00-07:00',
      });
      expect(noEnd.end, isNull);
    });
  });
}
