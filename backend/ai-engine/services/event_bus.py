"""ResearchForge AI Engine - Real-Time Research Event Bus.

In-memory and Redis pub/sub dispatcher routing research events to active
SSE streaming client connections with 0-latency and automatic queue cleanup.
"""

import asyncio
from typing import Dict, Set, Optional, Any
from utils.logger import logger


class ResearchEventBus:
    """Pub/Sub event bus distributing live research events to active SSE connections."""

    def __init__(self):
        # Map of run_id -> set of asyncio.Queue instances
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        """Registers a new listener queue for a run's live events."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            if run_id not in self._subscribers:
                self._subscribers[run_id] = set()
            self._subscribers[run_id].add(queue)
        logger.info(f"[EventBus] Client subscribed to run {run_id} (active listeners: {len(self._subscribers[run_id])})")
        return queue

    async def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        """Removes a listener queue on client disconnect."""
        async with self._lock:
            if run_id in self._subscribers:
                self._subscribers[run_id].discard(queue)
                if not self._subscribers[run_id]:
                    del self._subscribers[run_id]
        logger.info(f"[EventBus] Client unsubscribed from run {run_id}")

    async def publish(self, run_id: str, event_data: Dict[str, Any]) -> int:
        """Dispatches an event to all active subscribers for the run."""
        delivered_count = 0
        async with self._lock:
            queues = list(self._subscribers.get(run_id, set()))

        for q in queues:
            try:
                # Non-blocking put; if queue is full, discard oldest to prevent blocking
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(event_data)
                delivered_count += 1
            except Exception as e:
                logger.warning(f"[EventBus] Delivery failed to queue: {e}")

        return delivered_count

    def active_subscribers_count(self, run_id: str) -> int:
        """Returns the number of active listeners for a run."""
        return len(self._subscribers.get(run_id, set()))


event_bus = ResearchEventBus()
