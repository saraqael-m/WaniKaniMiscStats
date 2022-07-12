file = "wikipediakanji.txt"

def read_txt(filename):
	return open(filename, "r", encoding='utf8').read().replace("\n","")

def count_kanji(text):
	list = [c for c in text if u'\u4e00' < c < u'\u9fff'] # filter kanji
	count = [[c, list.count(c)] for c in set(list)] # counting
	return sorted(count, key = lambda x: x[1], reverse = True) # sort by frequency

print(count_kanji(read_txt(file)))