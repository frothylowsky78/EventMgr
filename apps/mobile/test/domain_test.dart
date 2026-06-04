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
}
