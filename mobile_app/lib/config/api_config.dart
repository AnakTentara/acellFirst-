class ApiConfig {
  // Default staging endpoint (bisa diganti seketika dari menu Pengaturan di dalam App)
  static String defaultBaseUrl = 'https://acellimut.haikaldev.my.id';
  static String stagingDomain = 'acellimut.haikaldev.my.id';
  static String primaryDomain = 'acellimut.net';

  static String baseUrl = defaultBaseUrl;

  static void setBaseUrl(String newUrl) {
    baseUrl = newUrl.replaceAll(RegExp(r'/$'), '');
  }
}
