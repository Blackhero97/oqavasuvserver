# iVMS-4200 Protocol Research

## User Discovery
Device DS-K1T341CMF sends real-time attendance events to iVMS-4200 client software.
This confirms device SUPPORTS real-time event transmission!

## iVMS-4200 Communication Methods

### 1. **SDK Protocol (Most Likely)**
iVMS uses Hikvision's proprietary SDK protocol for communication.
- **Port**: Usually 8000 (Device Port for SDK)
- **Protocol**: Binary protocol, event subscription based

### 2. **SADP Auto-Discovery**
iVMS discovers devices using SADP (Search Active Devices Protocol)
- **Port**: UDP 37020
- **Broadcast**: Device announces itself on network

### 3. **Event Subscription**
When iVMS connects to device:
1. Authenticates with device
2. Subscribes to events (Face Recognition, Access Control)
3. Receives real-time events via TCP connection

## Our Options

### Option A: SDK Integration
Use Hikvision Node SDK to connect like iVMS does
- ✅ Real-time events guaranteed
- ❌ Complex implementation
- ❌ May need official SDK license

### Option B: Database Integration
If iVMS stores events in local SQLite/MySQL:
- ✅ Simple to read
- ✅ Reliable data
- ❌ Not real-time (polling needed)

### Option C: Packet Capture & Reverse Engineer
Monitor iVMS traffic to understand protocol
- ✅ Could work
- ❌ Very complex
- ❌ May violate terms

### Option D: Configure Device for Both
Device can send to BOTH iVMS AND our server simultaneously
- Need to find "Multiple Event Receivers" setting

## Next Steps
1. Check Device Port 8000 status
2. Look for "Event Receiver" or "Multiple Platforms" config
3. Test if device can send to both iVMS and our webhook
