/**
 * OTTO -> GOOGLE AGENDA (leitura)
 * ------------------------------------------------------------------
 * Endpoint privado que devolve os eventos das suas agendas para o Otto.
 * Pode ficar no mesmo projeto do script da rotina (outro arquivo .gs).
 *
 * INSTALAÇÃO (uma vez):
 * 1. Crie um arquivo neste projeto (+ > Script), cole este código e salve.
 * 2. Execute a função "configurarOtto". Ela cria o token secreto e mostra
 *    no registro de execução. Copie para AGENDA_SCRIPT_TOKEN do backend.
 * 3. Implantar > Nova implantação > tipo "App da Web":
 *      Executar como: Eu
 *      Quem pode acessar: Qualquer pessoa
 *    Copie a URL do app da Web (termina em /exec) para AGENDA_SCRIPT_URL.
 *
 * "Qualquer pessoa" só abre a URL: sem o token, a resposta é
 * "unauthorized" e nenhum evento sai. Para trocar o token, execute
 * "trocarTokenOtto" e atualize o backend.
 */

var OTTO_TOKEN_KEY = "OTTO_TOKEN";
var OTTO_MAX_DAYS = 31;

function configurarOtto() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty(OTTO_TOKEN_KEY);
  if (!token) {
    token = novoTokenOtto_();
    props.setProperty(OTTO_TOKEN_KEY, token);
  }
  // Toca na agenda para o Google pedir a autorização agora.
  CalendarApp.getAllCalendars();
  Logger.log("AGENDA_SCRIPT_TOKEN=" + token);
}

function trocarTokenOtto() {
  PropertiesService.getScriptProperties().setProperty(
    OTTO_TOKEN_KEY,
    novoTokenOtto_(),
  );
  configurarOtto();
}

/**
 * GET ?token=...&from=<ISO>&to=<ISO>
 * -> { events: [{ id, title, start, end, allDay, location, description, calendar }] }
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var token =
    PropertiesService.getScriptProperties().getProperty(OTTO_TOKEN_KEY);
  if (!token || p.token !== token)
    return respostaOtto_({ error: "unauthorized" });

  var from = new Date(p.from);
  var to = new Date(p.to);
  if (
    isNaN(from.getTime()) ||
    isNaN(to.getTime()) ||
    to <= from ||
    to.getTime() - from.getTime() > OTTO_MAX_DAYS * 86400000
  ) {
    return respostaOtto_({ error: "invalid_range" });
  }

  var events = [];
  CalendarApp.getAllCalendars().forEach(function (agenda) {
    if (agenda.isHidden()) return;
    agenda.getEvents(from, to).forEach(function (evento) {
      events.push({
        id: evento.getId(),
        title: evento.getTitle() || "(sem título)",
        start: evento.getStartTime().toISOString(),
        end: evento.getEndTime().toISOString(),
        allDay: evento.isAllDayEvent(),
        location: evento.getLocation() || null,
        description: (evento.getDescription() || "").slice(0, 500) || null,
        calendar: agenda.getName(),
      });
    });
  });
  events.sort(function (a, b) {
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
  });
  return respostaOtto_({ events: events });
}

function respostaOtto_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function novoTokenOtto_() {
  return (
    Utilities.getUuid().replace(/-/g, "") +
    Utilities.getUuid().replace(/-/g, "")
  );
}
