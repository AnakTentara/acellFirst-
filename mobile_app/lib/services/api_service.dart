import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static Future<Map<String, dynamic>> getProfiles() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/auth/profiles'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load profiles');
  }

  static Future<Map<String, dynamic>> login(String username, String pin) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'pin': pin}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getInbox({String category = 'all'}) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/mail/inbox?category=$category'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load inbox');
  }

  static Future<Map<String, dynamic>> getShoppingItems() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/shopping/items'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load shopping items');
  }

  static Future<Map<String, dynamic>> getLoveLetters() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/love/letters'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load love letters');
  }

  static Future<Map<String, dynamic>> openLoveLetter(String id, String reaction) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/love/letters/$id/open'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'reaction': reaction}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getWishlist() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/wishlist'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load wishlist');
  }

  static Future<Map<String, dynamic>> getSystemConfig() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/system/config'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load system config');
  }

  static Future<Map<String, dynamic>> getLoveCounter() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/api/love/counter'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load counter');
  }
}
