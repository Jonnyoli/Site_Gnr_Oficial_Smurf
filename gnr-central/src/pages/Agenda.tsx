import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutList,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type AgendaView =
  | "LIST"
  | "CALENDAR";

type AgendaEvent = {
  id: string;
  eventKey?: string;
  title: string;
  description?: string;
  unit?: string;
  unitInfo?: {
    key?: string;
    name?: string;
    mention?: string;
    roleId?: string | null;
  };
  units?: Array<{
    key?: string;
    name?: string;
    mention?: string;
    roleId?: string | null;
  }>;
  startsAt: string;
  authorName?: string;
  createdAt?: string;
  jumpUrl?: string | null;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    contentType?: string;
  }>;
};

const WEEK_DAYS = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
];

async function api(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body
        ? {
            "Content-Type":
              "application/json",
          }
        : {}),
    },
    ...options,
  });

  const payload =
    await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        "O pedido falhou.",
    );
  }

  return payload;
}

function startOfMonth(
  date: Date,
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  );
}

function endOfMonth(
  date: Date,
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  );
}

function addMonths(
  date: Date,
  amount: number,
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1,
  );
}

function dayKey(
  date: Date | string,
) {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  if (
    Number.isNaN(value.getTime())
  ) {
    return "";
  }

  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      value.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Sem data";
  }

  return date.toLocaleString(
    "pt-PT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return date.toLocaleTimeString(
    "pt-PT",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function extractLocation(
  description?: string,
) {
  const match =
    String(description || "").match(
      /(?:^|\n)\s*(?:local|localização|localizacao)\s*:\s*([^\n\r]+)/i,
    );

  return (
    match?.[1]?.trim() ||
    "Local não indicado"
  );
}

function eventStatus(
  startsAt: string,
) {
  const now = new Date();
  const eventDate =
    new Date(startsAt);

  if (
    Number.isNaN(
      eventDate.getTime(),
    )
  ) {
    return {
      label: "Sem data",
      className:
        "border-white/10 bg-white/[0.04] text-white/35",
    };
  }

  if (
    dayKey(eventDate) ===
    dayKey(now)
  ) {
    return {
      label: "Hoje",
      className:
        "border-amber-400/20 bg-amber-500/10 text-amber-300",
    };
  }

  if (
    eventDate.getTime() <
    now.getTime()
  ) {
    return {
      label: "Concluído",
      className:
        "border-white/10 bg-white/[0.03] text-white/25",
    };
  }

  return {
    label: "Próximo",
    className:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  };
}

function buildCalendarDays(
  reference: Date,
) {
  const first =
    startOfMonth(reference);

  const last =
    endOfMonth(reference);

  const firstWeekday =
    (first.getDay() + 6) % 7;

  const total =
    firstWeekday +
    last.getDate();

  const cellCount =
    Math.ceil(total / 7) * 7;

  return Array.from(
    { length: cellCount },
    (_, index) => {
      const dayOffset =
        index - firstWeekday;

      const date = new Date(
        reference.getFullYear(),
        reference.getMonth(),
        dayOffset + 1,
      );

      return {
        date,
        currentMonth:
          date.getMonth() ===
            reference.getMonth(),
      };
    },
  );
}

export default function Agenda() {
  const [events, setEvents] =
    useState<AgendaEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [working, setWorking] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [error, setError] =
    useState("");

  const [view, setView] =
    useState<AgendaView>(
      "LIST",
    );

  const [visibleMonth, setVisibleMonth] =
    useState(
      startOfMonth(new Date()),
    );

  const [
    selectedDay,
    setSelectedDay,
  ] = useState<Date | null>(
    null,
  );

  const [
    hoveredDay,
    setHoveredDay,
  ] = useState<string | null>(
    null,
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const payload =
        await api("/api/agenda");

      setEvents(
        payload.events || [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a agenda.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term =
      query
        .trim()
        .toLowerCase();

    return events.filter(
      (event) =>
        !term ||
        [
          event.title,
          event.description,
          event.unit,
          event.unitInfo?.name,
          event.authorName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(term),
          ),
    );
  }, [events, query]);

  const eventsByDay =
    useMemo(() => {
      const map =
        new Map<
          string,
          AgendaEvent[]
        >();

      for (
        const event
        of filtered
      ) {
        const key =
          dayKey(
            event.startsAt,
          );

        if (!key) continue;

        if (!map.has(key)) {
          map.set(key, []);
        }

        map
          .get(key)!
          .push(event);
      }

      for (
        const dayEvents
        of map.values()
      ) {
        dayEvents.sort(
          (a, b) =>
            new Date(
              a.startsAt,
            ).getTime() -
            new Date(
              b.startsAt,
            ).getTime(),
        );
      }

      return map;
    }, [filtered]);

  const calendarDays =
    useMemo(
      () =>
        buildCalendarDays(
          visibleMonth,
        ),
      [visibleMonth],
    );

  const selectedEvents =
    useMemo(() => {
      if (!selectedDay) {
        return [];
      }

      return (
        eventsByDay.get(
          dayKey(selectedDay),
        ) || []
      );
    }, [
      selectedDay,
      eventsByDay,
    ]);

  const monthEvents =
    useMemo(() => {
      const month =
        visibleMonth.getMonth();

      const year =
        visibleMonth.getFullYear();

      return filtered.filter(
        (event) => {
          const date =
            new Date(
              event.startsAt,
            );

          return (
            !Number.isNaN(
              date.getTime(),
            ) &&
            date.getMonth() ===
              month &&
            date.getFullYear() ===
              year
          );
        },
      );
    }, [
      filtered,
      visibleMonth,
    ]);

  async function notify(
    event: AgendaEvent,
  ) {
    setWorking(event.id);

    try {
      const result =
        await api(
          `/api/agenda/${event.id}/notify`,
          {
            method: "POST",
          },
        );

      window.alert(
        `Notificação concluída: ${result.sent} enviadas, ${result.failed} falharam.`,
      );
    } catch (notifyError) {
      setError(
        notifyError instanceof Error
          ? notifyError.message
          : "Não foi possível notificar a unidade.",
      );
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="space-y-6 pb-14">
      <section className="rounded-[2.6rem] border border-primary/15 bg-[#06100c]/95 p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">
          Agenda operacional
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          Calendário da Guarda
        </h1>

        <p className="mt-3 text-sm text-white/35">
          Eventos sincronizados com o Discord, apresentados do mais recentemente publicado para o mais antigo.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-[1.7rem] border border-white/10 bg-[#06100c]/90 p-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <ViewButton
            active={
              view === "LIST"
            }
            icon={LayoutList}
            title="Lista de Eventos"
            description="Publicações do Discord por ordem de publicação."
            onClick={() =>
              setView("LIST")
            }
          />

          <ViewButton
            active={
              view ===
              "CALENDAR"
            }
            icon={CalendarDays}
            title="Calendário Mensal"
            description="Vista mensal com eventos marcados em cada dia."
            onClick={() =>
              setView(
                "CALENDAR",
              )
            }
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex h-14 flex-1 items-center rounded-2xl border border-white/10 bg-[#06100c]/90 px-4">
          <Search className="mr-3 h-5 w-5 text-primary" />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Pesquisar evento, unidade ou conteúdo..."
            className="h-full flex-1 bg-transparent text-sm text-white outline-none"
          />

          <span className="text-[8px] font-black uppercase text-white/20">
            {filtered.length} eventos
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            void load()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[8px] font-black uppercase text-white/50"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      ) : view === "LIST" ? (
        <EventList
          events={filtered}
          working={working}
          onNotify={notify}
        />
      ) : (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
            <div className="rounded-[2rem] border border-white/10 bg-[#06100c]/90 p-4 md:p-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary">
                    Calendário mensal
                  </p>

                  <h2 className="mt-2 text-2xl font-black capitalize text-white">
                    {visibleMonth.toLocaleDateString(
                      "pt-PT",
                      {
                        month:
                          "long",
                        year:
                          "numeric",
                      },
                    )}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(
                        addMonths(
                          visibleMonth,
                          -1,
                        ),
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45 transition hover:text-white"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(
                        startOfMonth(
                          new Date(),
                        ),
                      )
                    }
                    className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[8px] font-black uppercase text-primary"
                  >
                    Hoje
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(
                        addMonths(
                          visibleMonth,
                          1,
                        ),
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45 transition hover:text-white"
                    aria-label="Mês seguinte"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-1 md:gap-2">
                {WEEK_DAYS.map(
                  (day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.1em] text-white/25"
                    >
                      {day}
                    </div>
                  ),
                )}

                {calendarDays.map(
                  (
                    item,
                  ) => {
                    const key =
                      dayKey(
                        item.date,
                      );

                    const dayEvents =
                      eventsByDay.get(
                        key,
                      ) || [];

                    const isToday =
                      key ===
                      dayKey(
                        new Date(),
                      );

                    const isSelected =
                      selectedDay
                        ? key ===
                          dayKey(
                            selectedDay,
                          )
                        : false;

                    const isHovered =
                      hoveredDay ===
                      key;

                    return (
                      <div
                        key={key}
                        className="relative"
                        onMouseEnter={() =>
                          setHoveredDay(
                            key,
                          )
                        }
                        onMouseLeave={() =>
                          setHoveredDay(
                            null,
                          )
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDay(
                              item.date,
                            )
                          }
                          className={`min-h-[112px] w-full rounded-xl border p-2 text-left transition md:min-h-[132px] md:p-3 ${
                            isSelected
                              ? "border-primary/40 bg-primary/10"
                              : isToday
                                ? "border-amber-400/25 bg-amber-500/[0.07]"
                                : item.currentMonth
                                  ? "border-white/10 bg-black/20 hover:border-primary/20"
                                  : "border-white/[0.05] bg-black/10 opacity-35"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-black ${
                                isToday
                                  ? "text-amber-300"
                                  : item.currentMonth
                                    ? "text-white"
                                    : "text-white/30"
                              }`}
                            >
                              {item.date.getDate()}
                            </span>

                            {dayEvents.length > 0 && (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[7px] font-black text-primary">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {dayEvents
                              .slice(
                                0,
                                2,
                              )
                              .map(
                                (
                                  event,
                                ) => (
                                  <div
                                    key={
                                      event.id
                                    }
                                    className="truncate rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 py-1.5 text-[8px] font-black text-white/55"
                                  >
                                    <span className="mr-1 text-primary">
                                      •
                                    </span>
                                    {event.title}
                                  </div>
                                ),
                              )}

                            {dayEvents.length >
                              2 && (
                              <p className="px-1 text-[7px] font-black uppercase text-primary">
                                +
                                {dayEvents.length -
                                  2}{" "}
                                eventos
                              </p>
                            )}
                          </div>
                        </button>

                        {isHovered &&
                          dayEvents.length >
                            0 && (
                            <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-40 hidden w-72 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#07110d] p-4 shadow-2xl lg:block">
                              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-primary">
                                {item.date.toLocaleDateString(
                                  "pt-PT",
                                  {
                                    weekday:
                                      "long",
                                    day:
                                      "2-digit",
                                    month:
                                      "long",
                                  },
                                )}
                              </p>

                              <div className="mt-3 space-y-3">
                                {dayEvents
                                  .slice(
                                    0,
                                    3,
                                  )
                                  .map(
                                    (
                                      event,
                                    ) => (
                                      <div
                                        key={
                                          event.id
                                        }
                                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                                      >
                                        <p className="text-sm font-black text-white">
                                          {
                                            event.title
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-primary">
                                          {event.unitInfo?.name ||
                                            event.unit ||
                                            "Toda a Guarda"}
                                        </p>

                                        <p className="mt-2 flex items-center gap-2 text-xs text-white/35">
                                          <CalendarDays className="h-3.5 w-3.5" />
                                          {formatTime(
                                            event.startsAt,
                                          )}
                                        </p>
                                      </div>
                                    ),
                                  )}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <SummaryCard
                label="Eventos no mês"
                value={
                  monthEvents.length
                }
              />

              <SummaryCard
                label="Dias com eventos"
                value={
                  new Set(
                    monthEvents.map(
                      (event) =>
                        dayKey(
                          event.startsAt,
                        ),
                    ),
                  ).size
                }
              />

              <SummaryCard
                label="Próximos 7 dias"
                value={
                  filtered.filter(
                    (event) => {
                      const date =
                        new Date(
                          event.startsAt,
                        );

                      const now =
                        new Date();

                      const limit =
                        new Date(
                          now.getTime() +
                            7 *
                              86_400_000,
                        );

                      return (
                        date >=
                          now &&
                        date <=
                          limit
                      );
                    },
                  ).length
                }
              />

              <div className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-primary">
                  Como utilizar
                </p>

                <p className="mt-3 text-sm leading-6 text-white/35">
                  Passa o rato sobre um dia para pré-visualizar. Clica para abrir todos os eventos desse dia.
                </p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {selectedDay && (
        <DayEventsModal
          date={selectedDay}
          events={selectedEvents}
          working={working}
          onNotify={notify}
          onClose={() =>
            setSelectedDay(
              null,
            )
          }
        />
      )}
    </div>
  );
}

function ViewButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
        active
          ? "border-primary/25 bg-primary/10"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.03]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
          active
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-white/10 bg-black/20 text-white/25"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div>
        <p className="text-sm font-black text-white">
          {title}
        </p>

        <p className="mt-1 text-xs text-white/30">
          {description}
        </p>
      </div>
    </button>
  );
}

function EventList({
  events,
  working,
  onNotify,
}: {
  events: AgendaEvent[];
  working: string;
  onNotify: (
    event: AgendaEvent,
  ) => Promise<void>;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {events.map((event) => {
        const status =
          eventStatus(
            event.startsAt,
          );

        return (
          <article
            key={event.id}
            className={`rounded-[1.8rem] border border-white/10 bg-[#06100c]/90 p-5 ${
              status.label ===
              "Concluído"
                ? "opacity-65"
                : ""
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[8px] font-black uppercase text-primary">
                    {event.unitInfo?.name ||
                      event.unit ||
                      "Toda a Guarda"}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-black text-white">
                  {event.title}
                </h2>

                <p className="mt-2 text-xs text-white/30">
                  Publicado em{" "}
                  {event.createdAt
                    ? formatDateTime(
                        event.createdAt,
                      )
                    : "data desconhecida"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info
                icon={CalendarDays}
                label="Data e hora"
                value={formatDateTime(
                  event.startsAt,
                )}
              />

              <Info
                icon={MapPin}
                label="Local"
                value={extractLocation(
                  event.description,
                )}
              />
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/40">
              {event.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  working ===
                    event.id ||
                  event.unit ===
                    "GERAL"
                }
                onClick={() =>
                  void onNotify(
                    event,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[8px] font-black uppercase text-primary disabled:opacity-35"
              >
                <BellRing className="h-4 w-4" />
                Notificar unidade
              </button>

              {event.jumpUrl && (
                <a
                  href={
                    event.jumpUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir no Discord
                </a>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function DayEventsModal({
  date,
  events,
  working,
  onNotify,
  onClose,
}: {
  date: Date;
  events: AgendaEvent[];
  working: string;
  onNotify: (
    event: AgendaEvent,
  ) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#06100c] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-[#06100c]/95 p-6 backdrop-blur">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">
              Eventos do dia
            </p>

            <h2 className="mt-2 text-2xl font-black capitalize text-white">
              {date.toLocaleDateString(
                "pt-PT",
                {
                  weekday:
                    "long",
                  day: "2-digit",
                  month:
                    "long",
                  year:
                    "numeric",
                },
              )}
            </h2>

            <p className="mt-2 text-sm text-white/30">
              {events.length}{" "}
              {events.length === 1
                ? "evento"
                : "eventos"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">
              Não existem eventos registados neste dia.
            </div>
          ) : (
            events.map(
              (event) => (
                <article
                  key={event.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[8px] font-black uppercase text-primary">
                        {event.unitInfo?.name ||
                          event.unit ||
                          "Toda a Guarda"}
                      </span>

                      <h3 className="mt-3 text-xl font-black text-white">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm text-white/40">
                        {formatTime(
                          event.startsAt,
                        )}{" "}
                        ·{" "}
                        {extractLocation(
                          event.description,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          working ===
                            event.id ||
                          event.unit ===
                            "GERAL"
                        }
                        onClick={() =>
                          void onNotify(
                            event,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[8px] font-black uppercase text-primary disabled:opacity-35"
                      >
                        <BellRing className="h-4 w-4" />
                        Notificar
                      </button>

                      {event.jumpUrl && (
                        <a
                          href={
                            event.jumpUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase text-white/45"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Discord
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/40">
                    {event.description}
                  </p>
                </article>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[#06100c]/90 p-5">
      <CalendarDays className="h-5 w-5 text-primary" />

      <p className="mt-4 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>
    </article>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-white/25">
        <Icon className="h-3.5 w-3.5" />

        <p className="text-[7px] font-black uppercase tracking-[0.1em]">
          {label}
        </p>
      </div>

      <p className="mt-2 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  );
}
