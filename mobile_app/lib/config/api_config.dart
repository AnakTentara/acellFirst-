class ApiConfig {
  static String defaultBaseUrl = 'https://acellimut.my.id';
  static String stagingDomain = 'acellimut.my.id';
  static String primaryDomain = 'acellimut.my.id';

  static String baseUrl = defaultBaseUrl;

  static void setBaseUrl(String newUrl) {
    baseUrl = newUrl.replaceAll(RegExp(r'/$'), '');
  }
}
