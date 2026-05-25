from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, Unicode, UnicodeText, func
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.orm import relationship

from db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UNIQUEIDENTIFIER(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    username = Column(Unicode(80), nullable=False)
    email = Column(Unicode(255), nullable=False, unique=True)
    password_hash = Column(Unicode(255), nullable=False)
    avatar_url = Column(UnicodeText, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.sysutcdatetime())

    custom_backgrounds = relationship(
        "CustomBackground",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="CustomBackground.created_at.desc()",
    )


class CustomBackground(Base):
    __tablename__ = "custom_backgrounds"

    id = Column(UNIQUEIDENTIFIER(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(UNIQUEIDENTIFIER(as_uuid=False), ForeignKey("users.id"), nullable=False)
    image_url = Column(UnicodeText, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.sysutcdatetime())

    user = relationship("User", back_populates="custom_backgrounds")


class ListeningHistory(Base):
    __tablename__ = "listening_history"

    id = Column(UNIQUEIDENTIFIER(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(UNIQUEIDENTIFIER(as_uuid=False), ForeignKey("users.id"), nullable=False)
    track_id = Column(Unicode(255), nullable=False)
    title = Column(Unicode(500), nullable=False)
    channel = Column(Unicode(255), nullable=True)
    thumbnail = Column(UnicodeText, nullable=True)
    source = Column(Unicode(50), nullable=False)
    played_duration = Column(Float, nullable=False, default=0)
    played_at = Column(DateTime, nullable=False, server_default=func.sysutcdatetime())


class PlayerState(Base):
    __tablename__ = "player_states"

    id = Column(UNIQUEIDENTIFIER(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(UNIQUEIDENTIFIER(as_uuid=False), ForeignKey("users.id"), nullable=False, unique=True)
    current_track_json = Column(UnicodeText, nullable=True)
    current_time = Column("current_time", Float, nullable=False, default=0)
    volume = Column(Float, nullable=False, default=0.7)
    playlist_json = Column(UnicodeText, nullable=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.sysutcdatetime(), onupdate=func.sysutcdatetime())


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(UNIQUEIDENTIFIER(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(UNIQUEIDENTIFIER(as_uuid=False), ForeignKey("users.id"), nullable=False)
    name = Column(Unicode(255), nullable=False)
    is_system = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.sysutcdatetime())

    tracks = relationship(
        "PlaylistTrack",
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="PlaylistTrack.position",
    )


class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    id = Column(UNIQUEIDENTIFIER(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    playlist_id = Column(UNIQUEIDENTIFIER(as_uuid=False), ForeignKey("playlists.id"), nullable=False)
    track_id = Column(Unicode(255), nullable=False)
    source = Column(Unicode(50), nullable=False)
    title = Column(Unicode(500), nullable=False)
    channel = Column(Unicode(255), nullable=True)
    thumbnail = Column(UnicodeText, nullable=True)
    duration = Column(Unicode(20), nullable=True)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime, nullable=False, server_default=func.sysutcdatetime())

    playlist = relationship("Playlist", back_populates="tracks")
