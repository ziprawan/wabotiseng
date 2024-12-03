--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: chat_type; Type: TYPE; Schema: public;
--

CREATE TYPE public.chat_type AS ENUM (
    'Group',
    'Contact'
);


--
-- Name: participant_role; Type: TYPE; Schema: public;
--

CREATE TYPE public.participant_role AS ENUM (
    'MEMBER',
    'ADMIN',
    'SUPERADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_state_sync_key; Type: TABLE; Schema: public;
--

CREATE TABLE public.app_state_sync_key (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: app_state_sync_key_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.app_state_sync_key_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_state_sync_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.app_state_sync_key_id_seq OWNED BY public.app_state_sync_key.id;


--
-- Name: app_state_sync_version; Type: TABLE; Schema: public;
--

CREATE TABLE public.app_state_sync_version (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: app_state_sync_version_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.app_state_sync_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_state_sync_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.app_state_sync_version_id_seq OWNED BY public.app_state_sync_version.id;


--
-- Name: contact; Type: TABLE; Schema: public;
--

CREATE TABLE public.contact (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    saved_name character varying(100) NOT NULL,
    server_name character varying(100) NOT NULL
);


--
-- Name: cred; Type: TABLE; Schema: public;
--

CREATE TABLE public.cred (
    session_name character varying(255) NOT NULL,
    session_string text NOT NULL
);


--
-- Name: edunex_account; Type: TABLE; Schema: public;
--

CREATE TABLE public.edunex_account (
    id bigint NOT NULL,
    creds_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id bigint NOT NULL,
    token character varying(1000) NOT NULL
);


--
-- Name: edunex_account_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.edunex_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edunex_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.edunex_account_id_seq OWNED BY public.edunex_account.id;


--
-- Name: entity; Type: TABLE; Schema: public;
--

CREATE TABLE public.entity (
    id bigint NOT NULL,
    type public.chat_type NOT NULL,
    remote_jid character varying(50) NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: entity_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.entity_id_seq OWNED BY public.entity.id;


--
-- Name: group; Type: TABLE; Schema: public;
--

CREATE TABLE public."group" (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner character varying(100) NOT NULL,
    subject character varying(255) NOT NULL,
    subject_owner character varying(100),
    subject_time timestamp with time zone,
    "desc" text,
    desc_owner character varying(100),
    size integer DEFAULT 1 NOT NULL,
    creation timestamp with time zone,
    announce boolean DEFAULT false NOT NULL,
    restrict boolean DEFAULT false NOT NULL,
    join_approval_mode boolean DEFAULT false NOT NULL,
    member_add_mode boolean DEFAULT false NOT NULL,
    ephemeral_duration integer DEFAULT 0 NOT NULL,
    is_community boolean DEFAULT false NOT NULL,
    is_community_announce boolean DEFAULT false NOT NULL,
    linked_parent character varying(100),
    invite_code character varying(100)
);


--
-- Name: COLUMN "group".announce; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public."group".announce IS 'If this fields true, then the group doesn''t allow members to send message. Vice versa.';


--
-- Name: COLUMN "group".restrict; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public."group".restrict IS 'If this field is true, then only admin can edit the group''s info (such as title, picture, descriptions, etc.) and vice versa';


--
-- Name: COLUMN "group".join_approval_mode; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public."group".join_approval_mode IS 'True if joining the group need approval first.';


--
-- Name: COLUMN "group".member_add_mode; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public."group".member_add_mode IS 'True if only admin can add new member and vice versa';


--
-- Name: COLUMN "group".is_community_announce; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public."group".is_community_announce IS 'Still doesn''t know the meaning of this field.';


--
-- Name: message; Type: TABLE; Schema: public;
--

CREATE TABLE public.message (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    message_id character varying(100) NOT NULL,
    entity_id bigint NOT NULL,
    message text NOT NULL,
    deleted boolean DEFAULT false
);


--
-- Name: message_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.message_id_seq OWNED BY public.message.id;


--
-- Name: participant; Type: TABLE; Schema: public;
--

CREATE TABLE public.participant (
    id bigint NOT NULL,
    group_id bigint NOT NULL,
    participant_jid character varying(100) NOT NULL,
    role public.participant_role NOT NULL
);


--
-- Name: participant_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.participant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: participant_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.participant_id_seq OWNED BY public.participant.id;


--
-- Name: pre_key; Type: TABLE; Schema: public;
--

CREATE TABLE public.pre_key (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: pre_key_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.pre_key_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pre_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.pre_key_id_seq OWNED BY public.pre_key.id;


--
-- Name: request_delete_message; Type: TABLE; Schema: public;
--

CREATE TABLE public.request_delete_message (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirm_id character varying(100) NOT NULL,
    message_id character varying(100) NOT NULL,
    entity_id bigint NOT NULL,
    requested_by character varying(100) NOT NULL,
    agrees character varying(100)[] DEFAULT '{}'::character varying[] NOT NULL,
    disagrees character varying(100)[] DEFAULT '{}'::character varying[] NOT NULL,
    done boolean DEFAULT false NOT NULL
);


--
-- Name: request_delete_message_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.request_delete_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_delete_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.request_delete_message_id_seq OWNED BY public.request_delete_message.id;


--
-- Name: request_view_once; Type: TABLE; Schema: public;
--

CREATE TABLE public.request_view_once (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirm_id character varying(100) NOT NULL,
    message_id character varying(100) NOT NULL,
    entity_id bigint NOT NULL,
    requested_by character varying(100) NOT NULL,
    accepted boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN request_view_once.confirm_id; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public.request_view_once.confirm_id IS 'ID of confirmation message';


--
-- Name: COLUMN request_view_once.message_id; Type: COMMENT; Schema: public;
--

COMMENT ON COLUMN public.request_view_once.message_id IS 'ID of referenced message (it should be a view once message)';


--
-- Name: request_view_once_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.request_view_once_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_view_once_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.request_view_once_id_seq OWNED BY public.request_view_once.id;


--
-- Name: sender_key; Type: TABLE; Schema: public;
--

CREATE TABLE public.sender_key (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: sender_key_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.sender_key_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sender_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.sender_key_id_seq OWNED BY public.sender_key.id;


--
-- Name: sender_key_memory; Type: TABLE; Schema: public;
--

CREATE TABLE public.sender_key_memory (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: sender_key_memory_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.sender_key_memory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sender_key_memory_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.sender_key_memory_id_seq OWNED BY public.sender_key_memory.id;


--
-- Name: session; Type: TABLE; Schema: public;
--

CREATE TABLE public.session (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    content text NOT NULL,
    creds_name character varying(255) NOT NULL
);


--
-- Name: session_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.session_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: session_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.session_id_seq OWNED BY public.session.id;


--
-- Name: app_state_sync_key id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_key ALTER COLUMN id SET DEFAULT nextval('public.app_state_sync_key_id_seq'::regclass);


--
-- Name: app_state_sync_version id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_version ALTER COLUMN id SET DEFAULT nextval('public.app_state_sync_version_id_seq'::regclass);


--
-- Name: edunex_account id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.edunex_account ALTER COLUMN id SET DEFAULT nextval('public.edunex_account_id_seq'::regclass);


--
-- Name: entity id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.entity ALTER COLUMN id SET DEFAULT nextval('public.entity_id_seq'::regclass);


--
-- Name: message id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.message ALTER COLUMN id SET DEFAULT nextval('public.message_id_seq'::regclass);


--
-- Name: participant id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.participant ALTER COLUMN id SET DEFAULT nextval('public.participant_id_seq'::regclass);


--
-- Name: pre_key id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.pre_key ALTER COLUMN id SET DEFAULT nextval('public.pre_key_id_seq'::regclass);


--
-- Name: request_delete_message id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.request_delete_message ALTER COLUMN id SET DEFAULT nextval('public.request_delete_message_id_seq'::regclass);


--
-- Name: request_view_once id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.request_view_once ALTER COLUMN id SET DEFAULT nextval('public.request_view_once_id_seq'::regclass);


--
-- Name: sender_key id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.sender_key ALTER COLUMN id SET DEFAULT nextval('public.sender_key_id_seq'::regclass);


--
-- Name: sender_key_memory id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.sender_key_memory ALTER COLUMN id SET DEFAULT nextval('public.sender_key_memory_id_seq'::regclass);


--
-- Name: session id; Type: DEFAULT; Schema: public;
--

ALTER TABLE ONLY public.session ALTER COLUMN id SET DEFAULT nextval('public.session_id_seq'::regclass);


--
-- Name: app_state_sync_key app_state_sync_key_creds_and_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_key
    ADD CONSTRAINT app_state_sync_key_creds_and_name UNIQUE (name, creds_name);


--
-- Name: app_state_sync_key app_state_sync_key_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_key
    ADD CONSTRAINT app_state_sync_key_pk PRIMARY KEY (id);


--
-- Name: app_state_sync_version app_state_sync_version_creds_and_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_version
    ADD CONSTRAINT app_state_sync_version_creds_and_name UNIQUE (creds_name, name);


--
-- Name: app_state_sync_version app_state_sync_version_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_version
    ADD CONSTRAINT app_state_sync_version_pk PRIMARY KEY (id);


--
-- Name: contact contact_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_pk PRIMARY KEY (id);


--
-- Name: cred cred_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.cred
    ADD CONSTRAINT cred_pk PRIMARY KEY (session_name);


--
-- Name: edunex_account edunex_account_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.edunex_account
    ADD CONSTRAINT edunex_account_pk PRIMARY KEY (id);


--
-- Name: entity entity_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.entity
    ADD CONSTRAINT entity_pk PRIMARY KEY (id);


--
-- Name: entity entity_remote_jid_and_creds_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.entity
    ADD CONSTRAINT entity_remote_jid_and_creds_name UNIQUE (remote_jid, creds_name);


--
-- Name: group group_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public."group"
    ADD CONSTRAINT group_pk PRIMARY KEY (id);


--
-- Name: message message_entity_id; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_entity_id UNIQUE (message_id, entity_id);


--
-- Name: message message_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pk PRIMARY KEY (id);


--
-- Name: participant participant_group_jid; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.participant
    ADD CONSTRAINT participant_group_jid UNIQUE (participant_jid, group_id);


--
-- Name: participant participant_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.participant
    ADD CONSTRAINT participant_pk PRIMARY KEY (id);


--
-- Name: pre_key pre_key_creds_and_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.pre_key
    ADD CONSTRAINT pre_key_creds_and_name UNIQUE (name, creds_name);


--
-- Name: pre_key pre_key_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.pre_key
    ADD CONSTRAINT pre_key_pk PRIMARY KEY (id);


--
-- Name: request_delete_message request_delete_message_confirm_entity_id; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_delete_message
    ADD CONSTRAINT request_delete_message_confirm_entity_id UNIQUE (confirm_id, entity_id);


--
-- Name: request_delete_message request_delete_message_message_entity_id; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_delete_message
    ADD CONSTRAINT request_delete_message_message_entity_id UNIQUE (message_id, entity_id);


--
-- Name: request_delete_message request_delete_message_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_delete_message
    ADD CONSTRAINT request_delete_message_pk PRIMARY KEY (id);


--
-- Name: request_view_once request_view_once_confirm_entity_id; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_view_once
    ADD CONSTRAINT request_view_once_confirm_entity_id UNIQUE (confirm_id, entity_id);


--
-- Name: request_view_once request_view_once_message_entity_id; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_view_once
    ADD CONSTRAINT request_view_once_message_entity_id UNIQUE (entity_id, message_id);


--
-- Name: request_view_once request_view_once_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_view_once
    ADD CONSTRAINT request_view_once_pk PRIMARY KEY (id);


--
-- Name: sender_key sender_key_creds_and_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.sender_key
    ADD CONSTRAINT sender_key_creds_and_name UNIQUE (name, creds_name);


--
-- Name: sender_key_memory sender_key_memory_cred_and_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.sender_key_memory
    ADD CONSTRAINT sender_key_memory_cred_and_name UNIQUE (name, creds_name);


--
-- Name: sender_key_memory sender_key_memory_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.sender_key_memory
    ADD CONSTRAINT sender_key_memory_pk PRIMARY KEY (id);


--
-- Name: sender_key sender_key_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.sender_key
    ADD CONSTRAINT sender_key_pk PRIMARY KEY (id);


--
-- Name: session session_creds_and_name; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_creds_and_name UNIQUE (name, creds_name);


--
-- Name: session session_pk; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pk PRIMARY KEY (id);


--
-- Name: message_created_at_idx; Type: INDEX; Schema: public;
--

CREATE INDEX message_created_at_idx ON public.message USING btree (created_at DESC) WITH (deduplicate_items='true');


--
-- Name: contact contact_entity_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_entity_fk FOREIGN KEY (id) REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;


--
-- Name: app_state_sync_version cred_app_state_sync_version_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_version
    ADD CONSTRAINT cred_app_state_sync_version_fkey FOREIGN KEY (creds_name) REFERENCES public.cred(session_name) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: pre_key cred_pre_key_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.pre_key
    ADD CONSTRAINT cred_pre_key_fkey FOREIGN KEY (creds_name) REFERENCES public.cred(session_name) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: sender_key cred_sender_key_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.sender_key
    ADD CONSTRAINT cred_sender_key_fkey FOREIGN KEY (creds_name) REFERENCES public.cred(session_name) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: sender_key_memory cred_sender_key_memory_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.sender_key_memory
    ADD CONSTRAINT cred_sender_key_memory_fkey FOREIGN KEY (creds_name) REFERENCES public.cred(session_name) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: session cred_session_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT cred_session_fkey FOREIGN KEY (creds_name) REFERENCES public.cred(session_name) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: app_state_sync_key creds_app_state_sync_key_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.app_state_sync_key
    ADD CONSTRAINT creds_app_state_sync_key_fkey FOREIGN KEY (creds_name) REFERENCES public.cred(session_name) ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;


--
-- Name: edunex_account edunex_account_user_id_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.edunex_account
    ADD CONSTRAINT edunex_account_user_id_fk FOREIGN KEY (user_id) REFERENCES public.contact(id);


--
-- Name: group group_entity_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public."group"
    ADD CONSTRAINT group_entity_fk FOREIGN KEY (id) REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: message message_entity_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_entity_fk FOREIGN KEY (entity_id) REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: participant participant_group_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.participant
    ADD CONSTRAINT participant_group_fk FOREIGN KEY (group_id) REFERENCES public."group"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: request_delete_message request_delete_message_entity_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_delete_message
    ADD CONSTRAINT request_delete_message_entity_fk FOREIGN KEY (entity_id) REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: request_view_once request_view_once_entity_fk; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.request_view_once
    ADD CONSTRAINT request_view_once_entity_fk FOREIGN KEY (entity_id) REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

