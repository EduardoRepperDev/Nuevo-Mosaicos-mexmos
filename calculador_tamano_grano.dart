class CalculadorTamanoGrano {
  /// Retorna el radio aproximado en milímetros basado en la abertura de malla
  /// o el código de tamaño del grano.
  /// Utilizado para el renderizado del MosaicoViewer.
  static double inferirRadioMilimetros(String abertura, String codigoTamano) {
    abertura = abertura.toLowerCase().trim();

    // Si viene explícito en mm
    if (abertura.contains('mm')) {
      final valueStr = abertura.replaceAll(RegExp(r'[^\d.]'), '');
      final value = double.tryParse(valueStr);
      if (value != null) return value / 2.0; // Radio = Diámetro / 2
    }

    // Aberturas en pulgadas (fracciones)
    if (abertura.contains('3/4')) return 19.0 / 2.0; // ~19mm
    if (abertura.contains('1/2')) return 12.7 / 2.0; // ~12.7mm
    if (abertura.contains('7/16')) return 11.1 / 2.0; // ~11.1mm -> 3/8-1/2
    if (abertura.contains('1/4')) return 6.35 / 2.0; // ~6.35mm
    if (abertura.contains('3/16')) return 4.76 / 2.0; // ~4.76mm
    if (abertura.contains('1/8')) return 3.17 / 2.0; // ~3.17mm

    // Fallbacks si no coincide directamente por abertura, intentar por código
    if (codigoTamano.contains('5-6')) return 19.0 / 2.0;
    if (codigoTamano.contains('3-4')) return 12.7 / 2.0;
    if (codigoTamano.contains('2 1/2')) return 4.76 / 2.0;
    if (codigoTamano.contains('3')) return 6.35 / 2.0;
    if (codigoTamano.contains('0-2')) return 3.17 / 2.0;
    if (codigoTamano.contains('2')) return 3.17 / 2.0;
    if (codigoTamano.contains('1')) return 2.0 / 2.0;
    if (codigoTamano.contains('0 1/2')) return 1.1 / 2.0;

    // Valor por defecto si todo falla (ej. grano microscópico o desconocido)
    return 1.0;
  }
}
