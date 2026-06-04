class TransportationItem {
  final String id;
  final String transferType;
  final String group;
  final String? pickupDateTime;
  final String? pickupLocation;
  final String? dropoffLocation;
  final String? vendor;
  final String? contactPhone;
  final String? vehicleDescription;
  final String? notes;
  final String? mapLink;
  final String status; // scheduled | delayed | changed | completed

  const TransportationItem({
    required this.id,
    required this.transferType,
    required this.group,
    required this.status,
    this.pickupDateTime,
    this.pickupLocation,
    this.dropoffLocation,
    this.vendor,
    this.contactPhone,
    this.vehicleDescription,
    this.notes,
    this.mapLink,
  });

  factory TransportationItem.fromJson(Map<String, dynamic> j) => TransportationItem(
        id: j['id'] as String,
        transferType: j['transferType'] as String? ?? '',
        group: j['group'] as String? ?? '',
        pickupDateTime: j['pickupDateTime'] as String?,
        pickupLocation: j['pickupLocation'] as String?,
        dropoffLocation: j['dropoffLocation'] as String?,
        vendor: j['vendor'] as String?,
        contactPhone: j['contactPhone'] as String?,
        vehicleDescription: j['vehicleDescription'] as String?,
        notes: j['notes'] as String?,
        mapLink: j['mapLink'] as String?,
        status: j['status'] as String? ?? 'scheduled',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'transferType': transferType,
        'group': group,
        'pickupDateTime': pickupDateTime,
        'pickupLocation': pickupLocation,
        'dropoffLocation': dropoffLocation,
        'vendor': vendor,
        'contactPhone': contactPhone,
        'vehicleDescription': vehicleDescription,
        'notes': notes,
        'mapLink': mapLink,
        'status': status,
      };

  DateTime? get pickup =>
      pickupDateTime == null ? null : DateTime.tryParse(pickupDateTime!);
}
