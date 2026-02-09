import { useState, useEffect, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────
   useWeather — Live weather for Windermere via Open-Meteo
   Updates every 15 minutes, zero API keys required
   ────────────────────────────────────────────────────────── */

// Windermere / Gilpin Hotel coordinates
const LAT = 54.3833;
const LON = -2.9333;
const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Europe/London`;

// WMO Weather Code → emoji icon + description
function weatherCodeToIcon(code: number): { icon: string; description: string } {
    if (code <= 1) return { icon: '☀️', description: 'Clear' };
    if (code <= 3) return { icon: '⛅', description: 'Partly Cloudy' };
    if (code <= 48) return { icon: '🌫️', description: 'Foggy' };
    if (code <= 57) return { icon: '🌧️', description: 'Drizzle' };
    if (code <= 67) return { icon: '🌧️', description: 'Rain' };
    if (code <= 77) return { icon: '🌨️', description: 'Snow' };
    if (code <= 82) return { icon: '🌦️', description: 'Showers' };
    if (code <= 99) return { icon: '⛈️', description: 'Thunderstorm' };
    return { icon: '🌤️', description: 'Fair' };
}

export interface WeatherData {
    temp: number;
    icon: string;
    description: string;
    loading: boolean;
    error: boolean;
}

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useWeather(): WeatherData {
    const [data, setData] = useState<WeatherData>({
        temp: 0,
        icon: '🌤️',
        description: 'Loading...',
        loading: true,
        error: false,
    });

    const fetchWeather = useCallback(async () => {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            const temp = Math.round(json.current.temperature_2m);
            const code = json.current.weather_code as number;
            const { icon, description } = weatherCodeToIcon(code);

            setData({ temp, icon, description, loading: false, error: false });
        } catch (err) {
            console.warn('[Weather] Failed to fetch:', err);
            setData(prev => ({ ...prev, loading: false, error: true }));
        }
    }, []);

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchWeather]);

    return data;
}
