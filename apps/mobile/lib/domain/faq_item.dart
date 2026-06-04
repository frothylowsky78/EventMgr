class FaqItem {
  final String id;
  final String category;
  final String question;
  final String answer;
  final bool featured;
  final int order;

  const FaqItem({
    required this.id,
    required this.category,
    required this.question,
    required this.answer,
    required this.featured,
    required this.order,
  });

  factory FaqItem.fromJson(Map<String, dynamic> j) => FaqItem(
        id: j['id'] as String,
        category: j['category'] as String? ?? 'event_overview',
        question: j['question'] as String? ?? '',
        answer: j['answer'] as String? ?? '',
        featured: j['featured'] as bool? ?? false,
        order: j['order'] as int? ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'category': category,
        'question': question,
        'answer': answer,
        'featured': featured,
        'order': order,
      };

  String get categoryLabel =>
      category.split('_').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');

  bool matches(String q) {
    final s = q.toLowerCase();
    return question.toLowerCase().contains(s) || answer.toLowerCase().contains(s);
  }
}
