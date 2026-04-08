export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7d6",
          100: "#ffe9a3",
          500: "#f4c319",
          600: "#d9a800",
          900: "#17120b"
        },
        accent: "#d62828"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(15, 23, 42, 0.18)"
      }
    }
  },
  plugins: []
};
