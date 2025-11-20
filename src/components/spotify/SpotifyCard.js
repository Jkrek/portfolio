import React, { useEffect, useState } from "react";
import "./SpotifyCard.css";

// ⚠️ UPDATE THIS ONE VARIABLE
const CLIENT_SECRET = "7b6237cf0ad141edab07a73c10053b22"; 

// These are already set for you:
const CLIENT_ID = "b8f4e20a37bd4925b9c910902edb5f22"; 
const REFRESH_TOKEN = "AQCXWd4kHtfp319D6hPiIgvRVJG-fCQPEgX_WuwEJ07bo42AkRhmJf16A3pZmV4ji5BdNm5s83nhwMufxHU7Q5yYppUU0x8na7Xj_K9hPyTjBMTy67dND4eJ-ObqPru28_k";

const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;

const SpotifyCard = () => {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAccessToken = async () => {
    const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      }),
    });
    return response.json();
  };

  const getNowPlaying = async () => {
    try {
      const { access_token } = await getAccessToken();
      const response = await fetch(NOW_PLAYING_ENDPOINT, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (response.status === 204 || response.status > 400) {
        return null;
      }

      const songData = await response.json();
      return songData;
    } catch (e) {
      console.error("Error fetching Spotify:", e);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getNowPlaying();
      if (data && data.item) {
        setSong({
          title: data.item.name,
          artist: data.item.artists.map((_artist) => _artist.name).join(", "),
          albumArt: data.item.album.images[0].url,
          isPlaying: data.is_playing,
          url: data.item.external_urls.spotify,
        });
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !song) return null;

  return (
    <a href={song.url} target="_blank" rel="noreferrer" className="spotify-card-link">
      <div className="spotify-card">
        <img 
          src={song.albumArt} 
          alt="Album Art" 
          className={`album-art ${song.isPlaying ? "" : "paused"}`} 
        />
        <div className="song-info">
          <span className="song-name">
             {song.title.length > 25 ? song.title.substring(0, 25) + "..." : song.title}
          </span>
          <span className="artist-name">{song.artist}</span>
        </div>
        <svg className="spotify-icon" viewBox="0 0 167.5 167.5">
          <path fill="#1DB954" d="M83.7 0C37.5 0 0 37.5 0 83.7c0 46.3 37.5 83.7 83.7 83.7 46.3 0 83.7-37.5 83.7-83.7S130 0 83.7 0zM121 120.8c-1.4 2.5-4.6 3.2-7 1.7-19.8-12.1-44.8-14.9-74.1-8.1-2.8.6-5.6-1.1-6.2-3.9-.6-2.8 1.1-5.6 3.9-6.2 32.3-7.4 60.3-4.2 82.7 9.4 2.5 1.5 3.3 4.6 1.7 7.1zm10.1-22.5c-1.8 3-5.7 4-8.7 2.1-22.7-14-57.4-18-84-9.8-3.4 1-7-1-8-4.4-1-3.4 1-7 4.4-8 30.3-9.1 69.3-4.7 95.4 11.4 3 1.9 4 5.7 2.1 8.7zm.4-23c-27.2-16.1-72.1-17.6-98-9.7-4.1 1.2-8.5-1.1-9.7-5.3-1.2-4.1 1.1-8.5 5.3-9.7 30.2-9.2 79.6-7.4 110.9 11.2 3.7 2.2 4.9 6.9 2.7 10.7-2.2 3.7-6.9 4.9-10.7 2.7z"/>
        </svg>
      </div>
    </a>
  );
};

export default SpotifyCard;