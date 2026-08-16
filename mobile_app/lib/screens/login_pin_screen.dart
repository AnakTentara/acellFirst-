import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/glass_container.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class LoginPinScreen extends StatefulWidget {
  const LoginPinScreen({super.key});

  @override
  State<LoginPinScreen> createState() => _LoginPinScreenState();
}

class _LoginPinScreenState extends State<LoginPinScreen> {
  List<dynamic> _profiles = [];
  Map<String, dynamic>? _selectedUser;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfiles();
  }

  Future<void> _loadProfiles() async {
    try {
      final res = await ApiService.getProfiles();
      setState(() {
        _profiles = res['users'] ?? [];
        if (_profiles.isNotEmpty) _selectedUser = _profiles[0];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _profiles = [
          {
            'id': 'user_acell',
            'displayName': 'Acell',
            'nickname': 'Princess 👑',
            'role': 'girl',
            'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
          },
          {
            'id': 'user_haikal',
            'displayName': 'Haikal',
            'nickname': 'Prince 👑',
            'role': 'boy',
            'avatar': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          }
        ];
        _selectedUser = _profiles[0];
        _isLoading = false;
      });
    }
  }

  void _proceedLogin() {
    if (_selectedUser == null) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => HomeScreen(user: _selectedUser!)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCF9FB),
      body: Stack(
        children: [
          // Ambient background gradient
          Positioned(
            top: -120,
            right: -100,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFD1DC).withOpacity(0.6),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            left: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFE2EAFC).withOpacity(0.6),
              ),
            ),
          ),

          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: GlassContainer(
                  padding: const EdgeInsets.all(28.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF6B9D), Color(0xFFFF5C8A)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFF5C8A).withOpacity(0.35),
                              blurRadius: 18,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 30),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'Acel & Haikal Sanctuary',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF1D1D1F),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Pilih siapa yang sedang membuka app ✨',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          color: const Color(0xFF6E6E73),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Profile choices
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: _profiles.map((user) {
                          final isSelected = _selectedUser?['id'] == user['id'];
                          final isBoy = user['role'] == 'boy';

                          return GestureDetector(
                            onTap: () => setState(() => _selectedUser = user),
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isSelected ? (isBoy ? const Color(0xFFF0F5FF) : const Color(0xFFFFEFF5)) : Colors.white.withOpacity(0.6),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected ? (isBoy ? const Color(0xFF3A86FF) : const Color(0xFFFF5C8A)) : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: Column(
                                children: [
                                  CircleAvatar(
                                    radius: 26,
                                    backgroundImage: NetworkImage(user['avatar'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    user['displayName'] ?? '',
                                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 13),
                                  ),
                                  Text(
                                    user['nickname'] ?? '',
                                    style: GoogleFonts.plusJakartaSans(fontSize: 10, color: isBoy ? const Color(0xFF3A86FF) : const Color(0xFFFF5C8A)),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),

                      const SizedBox(height: 28),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _proceedLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFF5C8A),
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: Text(
                            'Masuk sebagai ${_selectedUser?['displayName'] ?? '...'} 💕',
                            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
