import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

randURL = "https://ja.wikipedia.org/wiki/%E7%89%B9%E5%88%A5:%E3%81%8A%E3%81%BE%E3%81%8B%E3%81%9B%E8%A1%A8%E7%A4%BA"

currentData = []

def get_data():
    global randURL
    page = requests.get(randURL, allow_redirects=True)
    soup = BeautifulSoup(page.content, "html.parser")
    title = soup.find(id="firstHeading").text
    bodyText = soup.find_all("div", class_="mw-parser-output")[0].prettify()
    page.close()
    return filter_kanji(bodyText), title

def filter_kanji(text):
    return "".join([c for c in text if u'\u4e00' < c < u'\u9fff'])

def collect_data(data, n):
    for _ in tqdm(range(n)):
        newData, title = get_data()
        data[0].append(title)
        data[1] += newData
    return data

print(collect_data(currentData, 1000))