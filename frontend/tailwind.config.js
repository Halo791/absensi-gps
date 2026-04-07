export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          900: "#172554"
        },
        accent: "#f97316"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(15, 23, 42, 0.18)"
      }
    }
  },
  plugins: []
};
