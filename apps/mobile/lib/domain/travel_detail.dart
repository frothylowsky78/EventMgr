class TravelDetail {
  final String? arrivalFlight;
  final String? arrivalDateTime;
  final String? departureFlight;
  final String? departureDateTime;
  final String? transferGroup;
  final String? hotelName;
  final String? hotelConfirmation;
  final String? checkInDate;
  final String? checkOutDate;
  final String? notes;

  const TravelDetail({
    this.arrivalFlight,
    this.arrivalDateTime,
    this.departureFlight,
    this.departureDateTime,
    this.transferGroup,
    this.hotelName,
    this.hotelConfirmation,
    this.checkInDate,
    this.checkOutDate,
    this.notes,
  });

  factory TravelDetail.fromJson(Map<String, dynamic> j) => TravelDetail(
        arrivalFlight: j['arrivalFlight'] as String?,
        arrivalDateTime: j['arrivalDateTime'] as String?,
        departureFlight: j['departureFlight'] as String?,
        departureDateTime: j['departureDateTime'] as String?,
        transferGroup: j['transferGroup'] as String?,
        hotelName: j['hotelName'] as String?,
        hotelConfirmation: j['hotelConfirmation'] as String?,
        checkInDate: j['checkInDate'] as String?,
        checkOutDate: j['checkOutDate'] as String?,
        notes: j['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'arrivalFlight': arrivalFlight,
        'arrivalDateTime': arrivalDateTime,
        'departureFlight': departureFlight,
        'departureDateTime': departureDateTime,
        'transferGroup': transferGroup,
        'hotelName': hotelName,
        'hotelConfirmation': hotelConfirmation,
        'checkInDate': checkInDate,
        'checkOutDate': checkOutDate,
        'notes': notes,
      };

  bool get isEmpty =>
      (arrivalFlight ?? '').isEmpty &&
      (departureFlight ?? '').isEmpty &&
      (hotelName ?? '').isEmpty &&
      (transferGroup ?? '').isEmpty;
}
