/**
 * Utilidades para manejo de fechas en zona horaria de Venezuela
 * Venezuela Time (VET) = UTC-4
 */

class DateUtils {
  static VENEZUELA_TIMEZONE_OFFSET = -4; // UTC-4 horas

  /**
   * Obtiene la fecha actual en zona horaria de Venezuela
   * @returns {Date} Fecha ajustada a Venezuela
   */
  static getVenezuelaDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const venezuelaTime = new Date(utc + (this.VENEZUELA_TIMEZONE_OFFSET * 3600000));
    return venezuelaTime;
  }

  /**
   * Formatea una fecha en zona horaria de Venezuela usando formato ISO
   * @param {Date} date - Fecha a formatear (opcional, usa fecha actual si no se proporciona)
   * @returns {string} Fecha formateada en formato ISO con zona horaria VET
   */
  static toVenezuelaISO(date = null) {
    const targetDate = date || new Date();
    const venezuelaDate = this.getVenezuelaDate();
    
    // Si se proporciona una fecha específica, ajustarla a Venezuela
    if (date) {
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const adjustedDate = new Date(utc + (this.VENEZUELA_TIMEZONE_OFFSET * 3600000));
      return adjustedDate.toISOString().replace('Z', '-04:00');
    }
    
    // Usar la fecha actual de Venezuela
    return venezuelaDate.toISOString().replace('Z', '-04:00');
  }

  /**
   * Formatea una fecha en zona horaria de Venezuela para logs
   * @param {Date} date - Fecha a formatear (opcional, usa fecha actual si no se proporciona)
   * @returns {string} Fecha formateada para logs
   */
  static toVenezuelaString(date = null) {
    const targetDate = date || new Date();
    const venezuelaDate = this.getVenezuelaDate();
    
    // Si se proporciona una fecha específica, ajustarla a Venezuela
    if (date) {
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const adjustedDate = new Date(utc + (this.VENEZUELA_TIMEZONE_OFFSET * 3600000));
      return adjustedDate.toISOString().replace('Z', '-04:00');
    }
    
    // Usar la fecha actual de Venezuela
    return venezuelaDate.toISOString().replace('Z', '-04:00');
  }

  /**
   * Obtiene solo la fecha (sin hora) en zona horaria de Venezuela para filtros
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  static getVenezuelaDateString() {
    return this.toVenezuelaISO().split('T')[0];
  }

  /**
   * Convierte una fecha UTC a zona horaria de Venezuela
   * @param {string} utcDateString - Fecha en formato UTC
   * @returns {string} Fecha convertida a Venezuela
   */
  static utcToVenezuela(utcDateString) {
    const utcDate = new Date(utcDateString);
    return this.toVenezuelaISO(utcDate);
  }

  /**
   * Formatea una fecha para mostrar en la interfaz en español
   * @param {Date|string} date - Fecha a formatear
   * @returns {string} Fecha formateada en español
   */
  static formatForDisplay(date) {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const venezuelaDate = this.getVenezuelaDate();
    
    // Ajustar la fecha a Venezuela si es necesario
    if (date) {
      const utc = targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000);
      const adjustedDate = new Date(utc + (this.VENEZUELA_TIMEZONE_OFFSET * 3600000));
      return adjustedDate.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Caracas'
      });
    }
    
    return venezuelaDate.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Caracas'
    });
  }
}

module.exports = DateUtils; 