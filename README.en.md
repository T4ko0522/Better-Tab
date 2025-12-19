# <img src="assets/icon.png" alt="Better Tab" width="32" height="32" style="vertical-align: middle; margin-right: 8px;" /> Better Tab

A customizable new tab page that brings together beautiful background images, clock, weather, calendar, and trending articles in one modern, user-friendly homepage.

![Better Tab Screenshot](assets/screen.png)

## ✨ Features

### 🎨 Background Customization
- **Image Upload**: Upload background images from local files
- **URL Input**: Set background by directly specifying image URLs
- **Video Support**: Use video files as backgrounds
- **Image Cropping**: Crop uploaded images freely
- **Auto Rotation**: Automatically rotate multiple background images randomly or by time of day

### ⏰ Clock & Weather
- **Real-time Clock**: Display current time in Japan Standard Time (JST)
- **Weather Information**: Weather forecasts based on location (Japan Meteorological Agency API)
  - Current temperature and weather conditions
  - Future forecasts (up to 3 days ahead)
  - Weather warnings and advisories

### 📅 Calendar
- **Monthly Calendar**: Display calendar for the current month
- **Holiday Display**: Automatically show Japanese holidays
- **Today Highlight**: Highlight today's date

### 📰 Trending Articles
- **Qiita Trends**: Display popular articles from Qiita
- **Article Tags**: Show tags for each article
- **External Links**: Click articles to open in a new tab

### 🔍 Search Functionality
- **Quick Search**: Search directly from the search bar
- **URL Parameter Support**: Specify search terms with `?q=search term`

### ⚙️ Settings
- **Show/Hide**: Toggle visibility of each widget (weather, calendar, trending articles)
- **Font Color**: Change text color to white or black
- **Data Persistence**: Save settings and background images using IndexedDB

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16
- **UI Library**: [React](https://react.dev/) 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Data Storage**: IndexedDB
- **Font**: [Geist](https://vercel.com/font)

## 📦 Key Dependencies

- `next`: Next.js framework
- `react` / `react-dom`: React library
- `@radix-ui/react-dialog`: Dialog component
- `@radix-ui/react-slot`: Slot component
- `lucide-react`: Icon library
- `next-themes`: Theme management
- `react-easy-crop`: Image cropping functionality
- `tailwindcss`: CSS framework

## 🌐 APIs

This project uses the following APIs:

- **Japan Meteorological Agency API**: Weather forecasts and warnings/advisories
- **OpenStreetMap Nominatim API**: Get city names from location data
- **holidays-jp.github.io API**: Japanese holiday information
- **Qiita API**: Trending articles

## 📁 Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   │   ├── weather/  # Weather information API
│   │   ├── holidays/ # Holiday information API
│   │   └── trending/ # Trending articles API
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── globals.css   # Global styles
├── components/       # React components
│   ├── calendar.tsx  # Calendar component
│   ├── clock.tsx     # Clock component
│   ├── trending-articles.tsx # Trending articles component
│   └── ui/           # UI components
├── hooks/            # Custom hooks
│   ├── useAppSettings.ts    # App settings management
│   └── useBackgroundImages.ts # Background image management
└── lib/              # Utilities
    ├── indexeddb-utils.ts   # IndexedDB operations
    ├── image-utils.ts        # Image processing
    └── utils.ts              # General utilities
```

## 🎯 Usage

1. **Setting Background Images**
   - Click the settings icon
   - Select the "Background" tab
   - Upload an image or enter a URL
   - Crop the image if necessary

2. **Show/Hide Widgets**
   - Click the settings icon
   - Select the "Display Settings" tab
   - Toggle visibility of each widget

3. **Search**
   - Enter search terms in the search bar at the center of the page
   - Press Enter or click the search button

## 📝 License

This project is licensed under the [Apache License 2.0](LICENSE).

