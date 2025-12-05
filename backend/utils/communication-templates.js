// backend/utils/communication-templates.js
// Bilingual communication templates for emails and SMS

/**
 * Get email templates based on preferred language
 * @param {string} language - 'en' or 'es'
 * @param {string} templateType - Type of template (welcome, reminder, etc.)
 * @param {object} data - Data to populate template
 * @returns {object} { subject, html, text }
 */
function getEmailTemplate(language, templateType, data = {}) {
  const templates = {
    // Welcome Email
    welcome: {
      en: {
        subject: `Welcome to ${data.agencyName || 'Our Agency'}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #172A3A;">Welcome, ${data.clientName}!</h1>
            <p>Thank you for choosing ${data.agencyName || 'us'} for your Medicare needs.</p>
            <p>Your agent, ${data.agentName || 'our team'}, is here to help you every step of the way.</p>
            <p>If you have any questions, please don't hesitate to reach out.</p>
            <p style="margin-top: 30px;">Best regards,<br>${data.agentName || 'Your Medicare Team'}</p>
          </div>
        `,
        text: `Welcome, ${data.clientName}!\n\nThank you for choosing ${data.agencyName || 'us'} for your Medicare needs. Your agent, ${data.agentName || 'our team'}, is here to help you every step of the way.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\n${data.agentName || 'Your Medicare Team'}`
      },
      es: {
        subject: `¡Bienvenido a ${data.agencyName || 'Nuestra Agencia'}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #172A3A;">¡Bienvenido, ${data.clientName}!</h1>
            <p>Gracias por elegirnos para sus necesidades de Medicare.</p>
            <p>Su agente, ${data.agentName || 'nuestro equipo'}, está aquí para ayudarle en cada paso del camino.</p>
            <p>Si tiene alguna pregunta, no dude en comunicarse con nosotros.</p>
            <p style="margin-top: 30px;">Saludos cordiales,<br>${data.agentName || 'Su Equipo de Medicare'}</p>
          </div>
        `,
        text: `¡Bienvenido, ${data.clientName}!\n\nGracias por elegirnos para sus necesidades de Medicare. Su agente, ${data.agentName || 'nuestro equipo'}, está aquí para ayudarle en cada paso del camino.\n\nSi tiene alguna pregunta, no dude en comunicarse con nosotros.\n\nSaludos cordiales,\n${data.agentName || 'Su Equipo de Medicare'}`
      }
    },

    // Policy Review Reminder
    policyReview: {
      en: {
        subject: 'Time for Your Annual Medicare Review',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #172A3A;">Hi ${data.clientName},</h1>
            <p>It's time for your annual Medicare policy review!</p>
            <p>Let's make sure your coverage still meets your needs and that you're getting the best value.</p>
            <p>Please call me at ${data.agentPhone || 'your earliest convenience'} to schedule a time that works for you.</p>
            <p style="margin-top: 30px;">Best regards,<br>${data.agentName}</p>
          </div>
        `,
        text: `Hi ${data.clientName},\n\nIt's time for your annual Medicare policy review! Let's make sure your coverage still meets your needs and that you're getting the best value.\n\nPlease call me at ${data.agentPhone || 'your earliest convenience'} to schedule a time that works for you.\n\nBest regards,\n${data.agentName}`
      },
      es: {
        subject: 'Es Hora de Su Revisión Anual de Medicare',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #172A3A;">Hola ${data.clientName},</h1>
            <p>¡Es hora de su revisión anual de póliza de Medicare!</p>
            <p>Asegurémonos de que su cobertura todavía satisface sus necesidades y que está obteniendo el mejor valor.</p>
            <p>Por favor llámeme al ${data.agentPhone || 'cuando le sea conveniente'} para programar una cita.</p>
            <p style="margin-top: 30px;">Saludos cordiales,<br>${data.agentName}</p>
          </div>
        `,
        text: `Hola ${data.clientName},\n\n¡Es hora de su revisión anual de póliza de Medicare! Asegurémonos de que su cobertura todavía satisface sus necesidades y que está obteniendo el mejor valor.\n\nPor favor llámeme al ${data.agentPhone || 'cuando le sea conveniente'} para programar una cita.\n\nSaludos cordiales,\n${data.agentName}`
      }
    },

    // Generic Message
    message: {
      en: {
        subject: data.subject || 'Message from Your Medicare Agent',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #172A3A;">Hi ${data.clientName},</h1>
            <p>${data.body || data.message}</p>
            <p style="margin-top: 30px;">Best regards,<br>${data.agentName || 'Your Medicare Team'}</p>
          </div>
        `,
        text: `Hi ${data.clientName},\n\n${data.body || data.message}\n\nBest regards,\n${data.agentName || 'Your Medicare Team'}`
      },
      es: {
        subject: data.subject || 'Mensaje de Su Agente de Medicare',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #172A3A;">Hola ${data.clientName},</h1>
            <p>${data.body || data.message}</p>
            <p style="margin-top: 30px;">Saludos cordiales,<br>${data.agentName || 'Su Equipo de Medicare'}</p>
          </div>
        `,
        text: `Hola ${data.clientName},\n\n${data.body || data.message}\n\nSaludos cordiales,\n${data.agentName || 'Su Equipo de Medicare'}`
      }
    }
  };

  const lang = language === 'es' || language === 'Spanish' ? 'es' : 'en';
  const template = templates[templateType] || templates.message;

  return template[lang];
}

/**
 * Get SMS templates based on preferred language
 * @param {string} language - 'en' or 'es'
 * @param {string} templateType - Type of template
 * @param {object} data - Data to populate template
 * @returns {string} SMS message text
 */
function getSMSTemplate(language, templateType, data = {}) {
  const templates = {
    // Welcome SMS
    welcome: {
      en: `Hi ${data.clientName}! Welcome to ${data.agencyName || 'our agency'}. I'm ${data.agentName}, your Medicare agent. Let me know if you have any questions!`,
      es: `¡Hola ${data.clientName}! Bienvenido a ${data.agencyName || 'nuestra agencia'}. Soy ${data.agentName}, su agente de Medicare. ¡Avíseme si tiene alguna pregunta!`
    },

    // Policy Review Reminder
    policyReview: {
      en: `Hi ${data.clientName}, it's time for your annual Medicare review. Please call me at ${data.agentPhone} to schedule. - ${data.agentName}`,
      es: `Hola ${data.clientName}, es hora de su revisión anual de Medicare. Por favor llámeme al ${data.agentPhone} para programar una cita. - ${data.agentName}`
    },

    // Appointment Reminder
    appointmentReminder: {
      en: `Hi ${data.clientName}, reminder: We have an appointment scheduled for ${data.appointmentDate}. Looking forward to speaking with you! - ${data.agentName}`,
      es: `Hola ${data.clientName}, recordatorio: Tenemos una cita programada para el ${data.appointmentDate}. ¡Espero hablar con usted! - ${data.agentName}`
    },

    // Generic Message
    message: {
      en: data.body || data.message || `Hi ${data.clientName}, ${data.agentName} here. Please call me when you get a chance.`,
      es: data.body || data.message || `Hola ${data.clientName}, soy ${data.agentName}. Por favor llámeme cuando pueda.`
    }
  };

  const lang = language === 'es' || language === 'Spanish' ? 'es' : 'en';
  const template = templates[templateType] || templates.message;

  return template[lang];
}

module.exports = {
  getEmailTemplate,
  getSMSTemplate
};
