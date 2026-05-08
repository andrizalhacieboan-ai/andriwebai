import axios from 'axios'
import * as cheerio from 'cheerio'

const USER_AGENT = 'Mozilla/5.0 (Android 15; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0'
const DEFAULT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOWQwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc3OTA4NjU1NSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfYWNjb3VudF9pZCI6IjZkNjQ3YzAwLTYzOTUtNDY0NS04ZmU4LWIzNTYzY2M1MmZiYyIsImNoYXRncHRfYWNjb3VudF91c2VyX2lkIjoidXNlci14clplYVd0QlBMRW81SE1icW9qbEVCODhfXzZkNjQ3YzAwLTYzOTUtNDY0NS04ZmU4LWIzNTYzY2M1MmZiYyIsImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9wbGFuX3R5cGUiOiJmcmVlIiwiY2hhdGdwdF91c2VyX2lkIjoidXNlci14clplYVd0QlBMRW81SE1icW9qbEVCODgiLCJ1c2VyX2lkIjoidXNlci14clplYVd0QlBMRW81SE1icW9qbEVCODgifSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9wcm9maWxlIjp7ImVtYWlsIjoiYW5kcml6YWxoYWNpZWJvYW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJpYXQiOjE3NzgyMjI1NTUsImlzcyI6Imh0dHBzOi8vYXV0aC5vcGVuYWkuY29tIiwianRpIjoiY2YxMjUyNTAtMWEzMi00MTVjLThkMGQtYzg4MGQzZDRhMTJlIiwibmJmIjoxNzc4MjIyNTU1LCJwd2RfYXV0aF90aW1lIjoxNzc4MjIyNTUzNDc1LCJzY3AiOlsib3BlbmlkIiwiZW1haWwiLCJwcm9maWxlIiwib2ZmbGluZV9hY2Nlc3MiLCJtb2RlbC5yZXF1ZXN0IiwibW9kZWwucmVhZCIsIm9yZ2FuaXphdGlvbi5yZWFkIiwib3JnYW5pemF0aW9uLndyaXRlIl0sInNlc3Npb25faWQiOiJhdXRoc2Vzc19MUVFENVl2THJjazh0SjhuWUVxUG1odFYiLCJzbCI6dHJ1ZSwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMTczNzg0MzI2NjcyMTA3OTc5NTkifQ.Yyabfn3ge7Rf5Xoj2tH-jOTaoxQCRyZTCkVd-U_if89THjqqu_WEDUJDlx6VX0wY1uw0-B98MmeeJti_eri_SdMPVuA0giQYOX0VtMO900m_SJO5SaHDxro4FoUhlR1eVQFPEtOKYJraf_Gd3ri3GjzX0xgY3TDnpBDuQ_xH_xlmywIGI7AHpkjUPr8aAqZyU1LauPG73xUw0oRU_H7oM9nWFQF6CwIzGf8aX5UmiSDvcgM4NLU5a9RYwi-8EcwMGBESslR993xG6wdj96zzli8mI75AvGJ5jFRvq978P8sCV7Ix1pr1NTj_T3NQnGLLHkOhA1mtp0DhInsv246qsoKk0z7f8iDc0VokYTgY8RY0MWCsLyNemqo1gW-AemJrfHdLYDW9Cw_dd-q7fC0zFkf1evNmjgbBasYycTXijrc7P7eck--ZCjPHTD5WAEdlo_Aq5TS_ViWTVato9wi2fgfSX6mTlvXE6JqWt1LMmYmoDwCbPUHrUcQkcfY-j4AI4n94hmVD59ln611RgZQ3G_AcRcEDUVc8MOoXExyvNMSN9KsZ6Iw3jFYzdl5BYx-URkG2n4DTT0xvJwWd4hdCr6vRf4Yv850_eZaHqRBYHtpaZAW5wAh5DM0-qVo014990sZoh_gW5HbGXik7s8jchEc3qmDLK5-sGpuJ01wC-lc'

const extractCookies = (headers) => {
    if (!headers['set-cookie']) return ''
    return headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
}

export const chatgptInit = async (authToken = DEFAULT_AUTH_TOKEN) => {
    try {
        const initRes = await axios.get('https://chatgpt.com/', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/'
            }
        })

        const $ = cheerio.load(initRes.data)
        const csrfToken = $('meta[name="csrf-token"]').attr('content') || ''
        const cookie = extractCookies(initRes.headers)

        await axios.post('https://chatgpt.com/ces/v1/rgstr?k=client-nb0qtYlZuy2tCMN5s5ncnuIBCJncjRViT0IzFm7GqST&st=javascript-client&sv=3.32.6&t=1778222617525&sid=cb63676c-d60d-4aaa-bfd7-9d59858c3c90&ec=80&gz=1', null, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/',
                'Cookie': cookie
            }
        })

        const bodyM = {"series":[{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}},{"type":"Counter","metric":"analytics_js.invoke","value":1,"tags":{"library":"analytics.js","library_version":"npm:next-1.81.1"}}]}
        await axios.post('https://chatgpt.com/ces/v1/m', JSON.stringify(bodyM), {
            headers: {
                'Content-Type': 'text/plain',
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/',
                'Cookie': cookie
            }
        })

        const bodyFlush = {"counters":[{"namespace":"default","metric":"chatgpt_sidebar_show","tags":{"key":"type","value":"popover"},"value":1},{"namespace":"ws","metric":"pubsub.init","tags":{},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Sidebar Show","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Locale Loaded","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_page_load_ttfi","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Composer Voice Use Loaded","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"ClientEventsServiceLogger.initialize.start","tags":{"appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"AnalyticsLogger.initialize.start","tags":{"app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"AnalyticsLogger.initialize.success","tags":{"app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_performance_page_load_javascript_resource_sizes","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":2},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_performance_page_load_resource_sizes","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":6},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"access_flow_success","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_user_identified","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Thread Header Upgrade Pill Button Shown","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_web_performance_time_to_fully_interactive","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_location_permission_state_observed","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Show Starter Prompts","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":2},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Show Trending Prompt","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":6},{"namespace":"ws","metric":"pubsub.fetch-socket-url.success","tags":{},"value":1},{"namespace":"default","metric":"chatgpt.announcement_shown","tags":{"id":"oai/apps/hasSeenImage2026RevampNux","type":"announcement"},"value":1},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_upsell_or_modal_shown","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"ClientEventsServiceLogger.initialize.success","tags":{"appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_image_styles_whats_new_modal_interaction","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Account Features Loaded","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1},{"namespace":"projects","metric":"latency_interaction","tags":{"interaction":"project_list_fetch","result":"completed"},"value":1},{"namespace":"segment","metric":"json_analytics_event_tracked","tags":{"platform":"web","event_name":"Toggle Model Switcher","appName":"chatgpt","appVersion":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":2},{"namespace":"segment","metric":"analytics_event_tracked","tags":{"platform":"web","event_name":"chatgpt_model_picker_event","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"value":1}],"histograms":[{"namespace":"default","metric":"web.vitals.fcp","tags":{"country":"ID","continent":"AS","device":"mobile","track":"stable","cluster":"unified-124"},"values":[5044]},{"namespace":"default","metric":"web.vitals.ttfb","tags":{"country":"ID","continent":"AS","device":"mobile","track":"stable","cluster":"unified-124"},"values":[4429]},{"namespace":"default","metric":"web.vitals.lcp","tags":{"country":"ID","continent":"AS","device":"mobile","track":"stable","cluster":"unified-124"},"values":[9317]},{"namespace":"projects","metric":"latency_interaction_duration_ms","tags":{"interaction":"project_list_fetch","result":"completed"},"values":[358]}],"client_type":"web"}
        await axios.post('https://chatgpt.com/ces/statsc/flush', JSON.stringify(bodyFlush), {
            headers: {
                'OAI-Language': 'id-ID',
                'OAI-Device-Id': '5d177a6b-716f-4f58-8415-efbce1e3b7c2',
                'OAI-Client-Version': 'prod-c9d58bd082f5fe5163759750852e4d690d489633',
                'OAI-Client-Build-Number': '6445842',
                'OAI-Session-Id': 'cb63676c-d60d-4aaa-bfd7-9d59858c3c90',
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/',
                'Cookie': cookie
            }
        })

        const bodyT = {"timestamp":"2026-05-08T06:46:24.892Z","integrations":{"Segment.io":true},"event":"Baseline prompts dismissed","type":"track","properties":{"client_thread_id":"WEB:6031f20f-f248-4fbf-9f54-4ce0d53832ac","use_case_id":"","message_id":"client-created-root","origin":"chat","app_version":"c9d58bd082f5fe5163759750852e4d690d489633"},"context":{"page":{"path":"/","referrer":"https://chatgpt.com/","search":"/","title":"ChatGPT","url":"https://chatgpt.com/","hash":""},"userAgent":"Mozilla/5.0 (Android 15; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0","locale":"id-ID","library":{"name":"analytics.js","version":"npm:next-1.81.1"},"campaign":{},"timezone":"Asia/Jakarta","app_name":"chatgpt","app_version":"c9d58bd082f5fe5163759750852e4d690d489633","browser_locale":"id-ID","device_id":"5d177a6b-716f-4f58-8415-efbce1e3b7c2","auth_status":"logged_in","user_traits":{"plan_type":"free","workspace_id":null,"workspace_type":null,"is_openai_internal":false},"is_business_ip2":"false"},"messageId":"ajs-next-1778222784892-d741bb6d-170a-473a-bfdc-d90f0c2bc49b","userId":"user-xrZeaWtBPLEo5HMbqojlEB88","anonymousId":"003ff2d5-ce50-47cf-8567-44a2b50205e8","writeKey":"oai","sentAt":"2026-05-08T06:46:25.037Z","_metadata":{"bundled":["Segment.io"],"unbundled":[],"bundledIds":[]}}}
        await axios.post('https://chatgpt.com/ces/v1/t', JSON.stringify(bodyT), {
            headers: {
                'Content-Type': 'text/plain',
                'OAI-Language': 'id-ID',
                'OAI-Device-Id': '5d177a6b-716f-4f58-8415-efbce1e3b7c2',
                'OAI-Client-Version': 'prod-c9d58bd082f5fe5163759750852e4d690d489633',
                'OAI-Client-Build-Number': '6445842',
                'OAI-Session-Id': 'cb63676c-d60d-4aaa-bfd7-9d59858c3c90',
                'Authorization': `Bearer ${authToken}`,
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/',
                'Cookie': cookie
            }
        })

        await axios.post('https://chatgpt.com/backend-api/sentinel/chat-requirements/finalize', null, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/c/69fd86b7-1a14-83ec-beb6-2c57d4dbc155',
                'Cookie': cookie,
                'Authorization': `Bearer ${authToken}`
            }
        })

        await axios.get('https://chatgpt.com/backend-api/conversation/69fd86b7-1a14-83ec-beb6-2c57d4dbc155/textdocs', {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/c/69fd86b7-1a14-83ec-beb6-2c57d4dbc155',
                'Cookie': cookie,
                'Authorization': `Bearer ${authToken}`
            }
        })

        const bodyResult = {"view":{"referrer":"https://chatgpt.com/","url":"https://chatgpt.com/c/69fd86b7-1a14-83ec-beb6-2c57d4dbc155"},"service":"chatgpt-web","session_id":"19d8b0b6-f7ea-4a73-a99c-b2afb8b2bc6d","session":{"id":"19d8b0b6-f7ea-4a73-a99c-b2afb8b2bc6d"},"usr":{"user_id":"user-xrZeaWtBPLEo5HMbqojlEB88","account_plan_type":"free","workspace_id":"6d647c00-6395-4645-8fe8-b3563cc52fbc","residency_region":"no_constraint","compute_residency":"no_constraint","anonymous_id":"75b7820b-54e3-4a44-bce9-88b81aca6884"},"track":"stable","is_electron_desktop_app":false,"date":1778222828859,"message":"Turn exchange complete","status":"info","origin":"logger","logger":{"name":"turn-analytics"},"request_id":"80ae2fe3-0447-4e7f-9ff8-edb7eae67381","turn_analytics":{"turn_trace_id":"10a62008-35b9-45a7-9d04-9aade43cebbc","turn_session_id":"350bf819-a734-45af-a43a-9c5892f3488f","turn_exchange_id":"6501a529-1f73-4d78-9044-9f06a89460b7","trigger":"submit","time_since_prompt_sent_ms":16340,"time_to_last_token_ms":14142,"first_input_to_submit_ms":39131,"stream_update_event_count":56,"model_message_update_count":40,"time_since_last_event_ms":2250,"api_open_delay":1663,"first_token_lat":3076,"first_final_channel_token_lat":3076,"first_visible_content_token_lat":3091,"api_start_delay":79,"completion_request_time_to_first_visible_message":2997,"bytes_received":28276,"stream_encoding":"v1","stream_protocol":"sse","stream_buffering":true,"model_slug":"auto","last_message_model_slug":"gpt-5-5","tools_used":[],"num_tools_used":0,"last_tool_used":null,"system_hints":[],"attachments":{"files":0,"images":0,"total":0},"has_kaur1br5_context_attachments":false,"has_kaur1br5_context_image_content":false,"is_kaur1br5":false,"plan_type":"free","plan_type_bucket":"free","temporary_chat":false,"server_ste_metadata":{"conduit_prewarmed":true,"plan_type":"free","plan_type_bucket":"free","user_agent":"web_android","service":null,"tool_name":null,"tool_invoked":false,"fast_convo":true,"warmup_state":"warm","is_first_turn":true,"cluster_region":"westus3","model_slug":"gpt-5-5","region":null,"is_multimodal":null,"did_auto_switch_to_reasoning":false,"auto_switcher_race_winner":null,"is_autoswitcher_enabled":false,"is_search":null,"did_prompt_contain_image":false,"search_tool_call_count":null,"search_tool_query_types":null,"message_id":"65afc7f7-4306-4136-aee0-37f0bce30050","request_id":"80ae2fe3-0447-4e7f-9ff8-edb7eae67381","turn_exchange_id":"6501a529-1f73-4d78-9044-9f06a89460b7","turn_trace_id":"10a62008-35b9-45a7-9d04-9aade43cebbc","a32e6ebcb":1,"resume_with_websockets":false,"low_turn_topic_ttl":false,"streaming_async_status":false,"replace_stream_status":true,"temporal_conversation_turn":false,"pro_mode_turn_topic_streaming":null,"turn_use_case":"text","turn_mode":"default"},"received_final_assistant_message":true,"rendered_final_assistant_message":"not_tracked","final_assistant_message_id":"e77a1aaf-ae1b-47d2-9504-15fb467d642e","final_assistant_content_type":"text","final_assistant_text_length":2067,"message_marker_latencies":{"user_visible_token":{"first_received":3076},"final_channel_token":{"first_received":3076},"last_token":{"last_received":14142}},"cluster":"unified-124","residency_region":"no_constraint","compute_residency":"no_constraint","await_timings":{},"await_duration_ms":0,"enabled_feature_flags":[],"disabled_feature_flags":[],"server_request_id":"80ae2fe3-0447-4e7f-9ff8-edb7eae67381","success_method":"initial_stream","turn_use_case":"text","turn_mode":"default","result":"success"},"turn_trace_id":"10a62008-35b9-45a7-9d04-9aade43cebbc","turn_session_id":"350bf819-a734-45af-a43a-9c5892f3488f","conversation_id":"69fd86b7-1a14-83ec-beb6-2c57d4dbc155","turn_exchange_id":"6501a529-1f73-4d78-9044-9f06a89460b7","ddtags":"sdk_version:6.22.0,env:prod,service:chatgpt-web,version:c9d58bd082f5fe5163759750852e4d690d489633"}
        await axios.post('https://chatgpt.com/ces/v1/telemetry/intake?ddforward=%2Fapi%2Fv2%2Flogs%3Fddsource%3Dbrowser%26dd-api-key%3Dpub1f79f8ac903a5872ae5f53026d20a77c%26dd-evp-origin-version%3D6.22.0%26dd-evp-origin%3Dbrowser%26dd-request-id%3D1e669380-2fc6-472f-9a06-4e92884d1753', JSON.stringify(bodyResult), {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://chatgpt.com/c/69fd86b7-1a14-83ec-beb6-2c57d4dbc155',
                'Cookie': cookie
            }
        })

        return { success: true, csrfToken }
    } catch (error) {
        console.error('ChatGPT Init Module Error:', error.message)
        throw error
    }
}

export default chatgptInit
