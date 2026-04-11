import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

type PermissionState = "undetermined" | "granted" | "denied";

type DetectedCityState = {
  city: string | null;
  isLoading: boolean;
  permission: PermissionState;
  requestCityDetection: () => Promise<void>;
};

function getBestCityName(geocode: Location.LocationGeocodedAddress | null): string | null {
  if (!geocode) return null;
  return (
    geocode.city?.trim() ||
    geocode.subregion?.trim() ||
    geocode.region?.trim() ||
    geocode.district?.trim() ||
    null
  );
}

export function useDetectedCity(): DetectedCityState {
  const [city, setCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("undetermined");

  useEffect(() => {
    if (Platform.OS === "web") {
      setPermission("denied");
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;

        const normalized: PermissionState =
          current.status === "granted"
            ? "granted"
            : current.status === "denied"
              ? "denied"
              : "undetermined";

        setPermission(normalized);
      } catch {
        if (mounted) setPermission("denied");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const requestCityDetection = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermission("denied");
      return;
    }

    setIsLoading(true);

    try {
      let status = permission;

      if (status !== "granted") {
        const next = await Location.requestForegroundPermissionsAsync();
        status =
          next.status === "granted"
            ? "granted"
            : next.status === "denied"
              ? "denied"
              : "undetermined";
        setPermission(status);
      }

      if (status !== "granted") return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const resolved = getBestCityName(places[0] ?? null);
      if (resolved) setCity(resolved);
    } catch {
      setPermission("denied");
    } finally {
      setIsLoading(false);
    }
  }, [permission]);

  useEffect(() => {
    if (permission !== "granted" || city) return;
    void requestCityDetection();
  }, [city, permission, requestCityDetection]);

  return { city, isLoading, permission, requestCityDetection };
}
