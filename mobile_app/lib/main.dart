import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/login_pin_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CoupleSanctuaryApp());
}

class CoupleSanctuaryApp extends StatelessWidget {
  const CoupleSanctuaryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Acel & Haikal Sanctuary',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF5C8A),
          primary: const Color(0xFFFF5C8A),
          surface: const Color(0xFFFCF9FB),
        ),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(
          Theme.of(context).textTheme,
        ),
      ),
      home: const LoginPinScreen(),
    );
  }
}
