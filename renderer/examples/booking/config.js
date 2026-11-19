export const bookingDemoConfig = Object.freeze({
  mapUrl: "../../demo-venue.json",
  locale: "es-MX",
  currency: "MXN",
  maxTickets: 10,
  event: Object.freeze({
    title: "Noche en el Recinto Demo",
    shortDate: "Sáb, 14 marzo · 20:00",
    date: "Sábado 14 de marzo, 20:00",
    doors: "Acceso desde las 18:30",
    venue: "Recinto de demostración",
    description: "Evento ficticio creado para probar la selección de localidades con SeatMap Renderer 2.0.",
  }),
});

export const vipOroPlataConfig = Object.freeze({
  ...bookingDemoConfig,
  mapUrl: "./vip-oro-plata.smf.json",
  preserveMapStyle: true,
  backgroundColor: 0xffffff,
  event: Object.freeze({
    ...bookingDemoConfig.event,
    title: "VIP, Oro y Plata",
  }),
});
