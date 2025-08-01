import { useState, useCallback } from "react";
import { QueueEntry, QueueSettings, QueueCommand } from "../types/queue";

const DEFAULT_SETTINGS: QueueSettings = {
  isOpen: true,
  requireMessage: false,
  joinMessage: "{username} has joined the queue! Position: {position}",
  leaveMessage: "{username} has left the queue.",
  queueFullMessage: "The queue is currently full. Please try again later.",
  queueClosedMessage: "The queue is currently closed.",
  maxQueueSize: 50
};

export const useQueue = () => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [settings, setSettings] = useState<QueueSettings>(DEFAULT_SETTINGS);

  const findUserInQueue = useCallback(
    (username: string): QueueEntry | undefined => {
      return queue.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
    },
    [queue]
  );

  const getUserPosition = useCallback(
    (username: string): number => {
      const index = queue.findIndex((entry) => entry.username.toLowerCase() === username.toLowerCase());
      return index === -1 ? -1 : index + 1;
    },
    [queue]
  );

  const addToQueue = useCallback(
    (username: string, message?: string): string => {
      if (!settings.isOpen) {
        return settings.queueClosedMessage;
      }

      if (settings.maxQueueSize && queue.length >= settings.maxQueueSize) {
        return settings.queueFullMessage;
      }

      if (findUserInQueue(username)) {
        return `${username}, you are already in the queue at position ${getUserPosition(username)}.`;
      }

      if (settings.requireMessage && !message?.trim()) {
        return `${username}, please provide a message when joining the queue. Example: !join YourGameUsername`;
      }

      const newEntry: QueueEntry = {
        id: Math.random().toString(36),
        username,
        message: message?.trim(),
        joinedAt: new Date(),
        isPlaying: false
      };

      setQueue((prev) => [...prev, newEntry]);

      const position = queue.length + 1;
      return settings.joinMessage.replace("{username}", username).replace("{position}", position.toString());
    },
    [queue, settings, findUserInQueue, getUserPosition]
  );

  const removeFromQueue = useCallback(
    (username: string): string => {
      const userEntry = findUserInQueue(username);
      if (!userEntry) {
        return `${username}, you are not in the queue.`;
      }

      setQueue((prev) => prev.filter((entry) => entry.username.toLowerCase() !== username.toLowerCase()));

      return settings.leaveMessage.replace("{username}", username);
    },
    [findUserInQueue, settings.leaveMessage]
  );

  const getPosition = useCallback(
    (username: string): string => {
      const position = getUserPosition(username);
      if (position === -1) {
        return `${username}, you are not in the queue.`;
      }

      const userEntry = findUserInQueue(username);
      const waitTime = userEntry ? Math.floor((Date.now() - userEntry.joinedAt.getTime()) / (1000 * 60)) : 0;

      return `${username}, you are position ${position} in the queue. Wait time: ${waitTime} minutes.`;
    },
    [getUserPosition, findUserInQueue]
  );

  const processCommand = useCallback(
    (command: QueueCommand): string => {
      switch (command.type) {
        case "join":
          return addToQueue(command.username, command.message);
        case "leave":
          return removeFromQueue(command.username);
        case "pos":
          return getPosition(command.username);
        default:
          return "";
      }
    },
    [addToQueue, removeFromQueue, getPosition]
  );

  const moveUser = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);
      return newQueue;
    });
  }, []);

  const markAsPlaying = useCallback((username: string) => {
    setQueue((prev) =>
      prev.map((entry) => (entry.username.toLowerCase() === username.toLowerCase() ? { ...entry, isPlaying: true, playingStartedAt: new Date() } : entry))
    );
  }, []);

  const markAsNotPlaying = useCallback((username: string) => {
    setQueue((prev) =>
      prev.map((entry) => (entry.username.toLowerCase() === username.toLowerCase() ? { ...entry, isPlaying: false, playingStartedAt: undefined } : entry))
    );
  }, []);

  const removeUser = useCallback((username: string) => {
    setQueue((prev) => prev.filter((entry) => entry.username.toLowerCase() !== username.toLowerCase()));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<QueueSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    queue,
    settings,
    processCommand,
    moveUser,
    markAsPlaying,
    markAsNotPlaying,
    removeUser,
    clearQueue,
    updateSettings
  };
};
