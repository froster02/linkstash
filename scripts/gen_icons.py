#!/usr/bin/env python3
"""Generate simple PNG icons for LinkStash PWA"""
import struct, zlib, os

def make_png(size, bg=(12,12,15), accent=(0,255,136)):
    """Create a simple PNG with a bookmark emoji style icon"""
    pixels = []
    cx, cy = size // 2, size // 2
    radius = int(size * 0.42)
    inner = int(size * 0.28)

    for y in range(size):
        row = []
        for x in range(size):
            # Round rect background
            pad = size // 8
            in_rect = (pad <= x < size - pad and pad <= y < size - pad)
            corner = size // 5

            # Simple circle bg
            dx, dy = x - cx, y - cy
            dist = (dx*dx + dy*dy) ** 0.5

            # Rounded square
            nx = abs(x - cx) - (cx - pad - corner)
            ny = abs(y - cy) - (cy - pad - corner)
            in_rounded = (nx <= 0 or ny <= 0 or (nx*nx + ny*ny) <= corner*corner) and \
                         abs(x - cx) <= cx - pad and abs(y - cy) <= cy - pad

            if in_rounded:
                # Draw bookmark shape inside
                bx = int(size * 0.28)
                ex = int(size * 0.72)
                by = int(size * 0.22)
                ey = int(size * 0.78)
                mid = (bx + ex) // 2
                notch_y = int(size * 0.52)
                notch_depth = int(size * 0.12)

                in_bookmark = (bx <= x <= ex and by <= y <= ey)
                # V notch at bottom
                if in_bookmark and y > notch_y:
                    progress = (y - notch_y) / (ey - notch_y)
                    notch_w = int(notch_depth * progress)
                    if abs(x - mid) < notch_w:
                        in_bookmark = False

                if in_bookmark:
                    row.extend(accent)
                else:
                    row.extend(bg)
            else:
                row.extend((0, 0, 0))  # transparent black outside

        pixels.append(bytes([0] + row))  # filter byte

    # Build PNG
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    idat_data = zlib.compress(b''.join(pixels))

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr_data) +
            chunk(b'IDAT', idat_data) +
            chunk(b'IEND', b''))

out_dir = os.path.dirname(os.path.abspath(__file__))
for size in [192, 512]:
    png = make_png(size)
    path = os.path.join(out_dir, f'icon-{size}.png')
    with open(path, 'wb') as f:
        f.write(png)
    print(f'Created {path} ({len(png)} bytes)')
print('Done!')
