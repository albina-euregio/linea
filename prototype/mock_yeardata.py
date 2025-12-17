import numpy as np

from datetime import datetime



header = """SMET 1.1 ASCII
[HEADER]
station_id = FSEE2
station_name = Schlicker Alm
latitude = 47.154432
longitude = 11.303207
altitude = 1645.0
source = LWD Tirol
nodata = -777.0
creation = 2025-11-11T02:15:09.840785100Z
fields = timestamp HS PSUM TA TD NS
#parameters = timestamp HS PSUM TA TD NS
#units = ISO8601 m mm K K cm
[DATA]"""

dates = np.arange(np.datetime64('1991-12-30T23:00:00Z'), np.datetime64('2025-11-09T23:00:00Z'), np.timedelta64(24, 'h'))


hs = np.genfromtxt("hs.data")
psum = np.zeros(dates.shape)
ta = np.zeros(dates.shape)
td = np.zeros(dates.shape)
ns = np.zeros(dates.shape)

rng = np.random.default_rng()


for i in range(psum.size // 60):
    psum[int(np.random.rand()*psum.size)] = f"{np.random.rand()*10:.2f}"

for i in range(psum.size // 33):
    ns[int(np.random.rand()*psum.size)] = f"{np.random.rand()*15:.2f}"

def tempfunc(i):
    partinyear = i/365
    t = np.sin(partinyear*2*np.pi-0.5*np.pi)*17 + rng.normal(0, 5, 1) + 273.15
    
    ta[i] = f"{float(t):.2f}"
    td[i] = f"{float(t - 10):.2f}"

for i in range(len(ta)):
    tempfunc(i)



dates_str = np.array([np.datetime_as_string(d, unit='s') for d in dates])
np.savetxt('mock.data', np.array([dates_str, hs, psum, ta, td, ns]).T, fmt="%s %s %s %s %s %s", header = header, comments='')


