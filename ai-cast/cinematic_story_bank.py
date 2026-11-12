"""Original, finite story queue; live research and existing validators remain mandatory."""
import copy
from datetime import datetime


def select_story(bank, episode, seconds, source, history, config, validate):
    if bank.get('version') != 1:
        raise ValueError('Unknown project story-bank format')
    if (not isinstance(source, dict) or len(source.get('excerpt', '')) < 90 or
            not source.get('url') or not source.get('retrieved_at')):
        raise ValueError('Project stories require freshly fetched official research')
    stamp = datetime.fromisoformat(source['retrieved_at'].replace('Z', '+00:00'))
    if stamp.tzinfo is None:
        raise ValueError('Research timestamp must include timezone')
    request = config.get('next_story')
    used_ids = {item.get('story_id') for item in history}
    used_titles = {str(item.get('title_de', '')).casefold() for item in history}
    if request and episode >= request['from_episode'] and request['story_id'] not in used_ids:
        # The queue never replaces an outstanding specific owner request.
        required_id = request['story_id']
    else:
        required_id = None
    for item in bank.get('stories', []):
        if episode >= config.get('story_quality', {}).get('from_episode', 10**9) and config.get('story_quality', {}).get('require_comic_beats') and not item.get('comedy_beats'):
            continue
        if item['story_id'] in used_ids or item['title_de'].casefold() in used_titles:
            continue
        if required_id and item['story_id'] != required_id:
            continue
        if source['url'] not in item['research_urls']:
            continue
        indices = item.get('variants', {}).get(str(seconds))
        if not indices:
            continue
        if len(indices) != seconds // 5 or len(set(indices)) != len(indices):
            raise ValueError('Project story variant has invalid shot indices')
        candidate = copy.deepcopy(item)
        candidate.pop('research_urls');candidate.pop('variants')
        candidate['scenes'] = [candidate['scenes'][index] for index in indices]
        if any(s.get('location_key') != candidate['location_key'] for s in candidate['scenes']):
            raise ValueError('A queued story must stay in its coherent location')
        candidate.update(episode=episode, duration_seconds=seconds,
                         research_source=copy.deepcopy(source),
                         story_provider='project-authored-bank-v1')
        if candidate.get('cast_profile')=='lina-oma-v1':
            candidate['documented_basis']['report_url']=source['url']
        from cinematic_design import enabled, apply_plan
        if enabled(config,episode):
            apply_plan(candidate)
        # No alternate, reduced validation path: all existing source/story/duration gates apply.
        return validate(candidate, episode, history, config)
    return None  # Exhaustion is explicit; never loop old stories or invent source evidence.


def unused_source_urls(bank,episode,seconds,history,config):
    used_ids={item.get('story_id') for item in history}
    used_titles={str(item.get('title_de','')).casefold() for item in history}
    request=config.get('next_story')
    required=(request['story_id'] if request and episode>=request['from_episode']
              and request['story_id'] not in used_ids else None)
    urls=[]
    for item in bank['stories']:
        if episode >= config.get('story_quality', {}).get('from_episode', 10**9) and config.get('story_quality', {}).get('require_comic_beats') and not item.get('comedy_beats'):
            continue
        if item['story_id'] in used_ids or item['title_de'].casefold() in used_titles:
            continue
        if required and item['story_id']!=required:
            continue
        if str(seconds) not in item.get('variants',{}):
            continue
        for url in item['research_urls']:
            if url not in urls:urls.append(url)
    return urls
