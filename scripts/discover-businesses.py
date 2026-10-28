"""Bounded, operator-triggered Overture Places read; JSON only on stdout.

No business websites are fetched. No credentials or paid AWS account are used.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / '.local-research' / 'python'))

AREAS = {
    'raleigh': (-78.85, 35.65, -78.45, 35.95),
    'austin': (-97.9, 30.15, -97.6, 30.45),
    'tampa': (-82.6, 27.85, -82.3, 28.15),
}
TRADES = {'all': ['hvac_service', 'plumbing', 'electrician'],
          'hvac': ['hvac_service'], 'plumbing': ['plumbing'], 'electrical': ['electrician']}


def discover(area, trade):
    from overturemaps import record_batch_reader
    from overturemaps.core import get_latest_release
    release = get_latest_release()
    reader = record_batch_reader('place', bbox=AREAS[area], release=release,
                                 connect_timeout=10, request_timeout=25, stac=True)
    found, seen, scanned = [], set(), 0
    if reader:
        for batch in reader:
            for p in batch.to_pylist():
                scanned += 1
                category = (p.get('taxonomy') or {}).get('primary')
                addresses = [a for a in p.get('addresses') or [] if a.get('country') == 'US']
                if (category in TRADES[trade] and addresses and p.get('id') not in seen
                        and (p.get('names') or {}).get('primary')):
                    seen.add(p['id'])
                    # No personal emails/street addresses are needed for this research preview.
                    found.append({
                        'id': p['id'], 'name': p['names']['primary'], 'category': category,
                        'city': addresses[0].get('locality'), 'region': addresses[0].get('region'),
                        'country': 'US', 'websites': p.get('websites') or [],
                        'phones': p.get('phones') or [], 'confidence': p.get('confidence'),
                        'status': p.get('operating_status'),
                        'sources': [{'dataset': s.get('dataset'), 'license': s.get('license'),
                                     'updateTime': s.get('update_time')} for s in p.get('sources') or []],
                    })
                if len(found) >= 20 or scanned >= 100000:
                    break
            if len(found) >= 20 or scanned >= 100000:
                break
        reader.close()
    return {'release': release, 'scanned': scanned, 'limited': len(found) >= 20 or scanned >= 100000,
            'businesses': found}


if __name__ == '__main__':
    try:
        if len(sys.argv) != 3 or sys.argv[1] not in AREAS or sys.argv[2] not in TRADES:
            raise ValueError('Choose a supported area and trade.')
        print(json.dumps(discover(sys.argv[1], sys.argv[2])))
    except Exception:
        # Source errors must not disclose environment values or pretend to be zero results.
        print('Overture reader unavailable. Check installation/network; no businesses saved.', file=sys.stderr)
        sys.exit(1)
