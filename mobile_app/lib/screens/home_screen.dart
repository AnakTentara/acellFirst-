import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cupertino_icons/cupertino_icons.dart';
import '../widgets/glass_container.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const HomeScreen({super.key, required this.user});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  String _togetherText = '...';
  List<dynamic> _emails = [];
  List<dynamic> _shoppingItems = [];
  List<dynamic> _letters = [];
  List<dynamic> _wishlist = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    try {
      final counter = await ApiService.getLoveCounter();
      final inbox = await ApiService.getInbox();
      final shop = await ApiService.getShoppingItems();
      final love = await ApiService.getLoveLetters();
      final wish = await ApiService.getWishlist();

      setState(() {
        _togetherText = counter['togetherString'] ?? 'Hari Bersama 💕';
        _emails = inbox['emails'] ?? [];
        _shoppingItems = shop['items'] ?? [];
        _letters = love['letters'] ?? [];
        _wishlist = wish['items'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCF9FB),
      body: Stack(
        children: [
          // Background Gradient Bubbles (iOS Mesh Gradient)
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFD1DC).withOpacity(0.55),
              ),
            ),
          ),
          Positioned(
            top: 200,
            right: -100,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFE2EAFc).withOpacity(0.6),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top Couple Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: GlassContainer(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundImage: NetworkImage(widget.user['avatar'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'),
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.user['displayName'] ?? 'Acel',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: const Color(0xFF1D1D1F),
                                  ),
                                ),
                                Text(
                                  _togetherText,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 11,
                                    color: const Color(0xFFFF5C8A),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh_rounded, color: Color(0xFFFF5C8A), size: 20),
                          onPressed: _loadAllData,
                        ),
                      ],
                    ),
                  ),
                ),

                // Main Views
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF5C8A)))
                      : RefreshIndicator(
                          color: const Color(0xFFFF5C8A),
                          onRefresh: _loadAllData,
                          child: _buildCurrentTab(),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),

      // Bottom Navigation Bar (Apple Liquid Glass)
      bottomNavigationBar: GlassContainer(
        borderRadius: 24,
        margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, Icons.mail_outline_rounded, Icons.mail_rounded, 'Inbox'),
            _buildNavItem(1, Icons.shopping_bag_outlined, Icons.shopping_bag_rounded, 'Belanja'),
            _buildNavItem(2, Icons.favorite_border_rounded, Icons.favorite_rounded, 'Surat'),
            _buildNavItem(3, Icons.stars_outlined, Icons.stars_rounded, 'Wishlist'),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFF5C8A).withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? activeIcon : icon,
              color: isSelected ? const Color(0xFFFF5C8A) : const Color(0xFF86868B),
              size: 22,
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFFFF5C8A),
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentIndex) {
      case 0:
        return _buildInboxView();
      case 1:
        return _buildShoppingView();
      case 2:
        return _buildLoveView();
      case 3:
        return _buildWishlistView();
      default:
        return const SizedBox();
    }
  }

  // 1. Inbox View
  Widget _buildInboxView() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _emails.length,
      itemBuilder: (context, index) {
        final mail = _emails[index];
        final isShopping = mail['category'] == 'shopping';
        final isLove = mail['category'] == 'love';

        return GlassContainer(
          margin: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isShopping ? const Color(0xFFFFECE6) : isLove ? const Color(0xFFFFEFF5) : const Color(0xFFF0F5FF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isShopping ? '🛍️ Belanja' : isLove ? '💌 Surat Cinta' : '📬 Email',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: isShopping ? const Color(0xFFEE4D2D) : isLove ? const Color(0xFFFF5C8A) : const Color(0xFF3A86FF),
                      ),
                    ),
                  ),
                  Text(
                    'to: ${mail['alias_name'] ?? 'general'}@',
                    style: GoogleFonts.plusJakartaSans(fontSize: 10, color: const Color(0xFF86868B)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                mail['subject'] ?? '(Tanpa Subjek)',
                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 14, color: const Color(0xFF1D1D1F)),
              ),
              const SizedBox(height: 4),
              Text(
                mail['text_body'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.plusJakartaSans(fontSize: 12, color: const Color(0xFF6E6E73), height: 1.4),
              ),
            ],
          ),
        );
      },
    );
  }

  // 2. Shopping View
  Widget _buildShoppingView() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _shoppingItems.length,
      itemBuilder: (context, index) {
        final item = _shoppingItems[index];
        final isDelivered = item['status'] == 'delivered';

        return GlassContainer(
          margin: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEE4D2D),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      item['platform'] ?? 'E-Commerce',
                      style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                  ),
                  Text(
                    item['status'] == 'shipping' ? '🚚 Sedang Dikirim' : isDelivered ? '✅ Telah Diterima' : '⏳ Diproses',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isDelivered ? const Color(0xFF059669) : const Color(0xFF3A86FF),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                item['item_title'] ?? 'Paket Belanjaan',
                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 14),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text(
                      'Resi: ${item['tracking_number'] ?? '-'} (${item['courier'] ?? 'Kurir'})',
                      style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // 3. Love View
  Widget _buildLoveView() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _letters.length,
      itemBuilder: (context, index) {
        final letter = _letters[index];
        final isLocked = letter['is_currently_locked'] == 1;

        return GlassContainer(
          margin: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  Text(
                    'Dari: ${letter['author_name'] ?? 'Pasanganmu'} 💕',
                    style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFFFF5C8A)),
                  ),
                  if (isLocked)
                    const Icon(Icons.lock_clock_rounded, size: 16, color: Color(0xFF8338EC))
                  else if (letter['reaction'] != null)
                    Text(letter['reaction'], style: const TextStyle(fontSize: 14)),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                letter['title'] ?? 'Surat Cinta',
                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              const SizedBox(height: 6),
              Text(
                letter['content'] ?? '',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.plusJakartaSans(fontSize: 12, color: const Color(0xFF6E6E73), height: 1.5),
              ),
            ],
          ),
        );
      },
    );
  }

  // 4. Wishlist View
  Widget _buildWishlistView() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _wishlist.length,
      itemBuilder: (context, index) {
        final wish = _wishlist[index];
        final isBought = wish['is_bought'] == 1;

        return GlassContainer(
          margin: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  wish['image_url'] ?? 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=150',
                  width: 60,
                  height: 60,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      wish['title'] ?? '',
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Rp ${(wish['price'] ?? 0).toString()}',
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 13, color: const Color(0xFFFF5C8A)),
                    ),
                    if (isBought)
                      Container(
                        margin: const EdgeInsets.only(top: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6)),
                        child: Text('✓ Terwujud 🎉', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF059669))),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
