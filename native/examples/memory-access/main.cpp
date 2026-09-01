#include <cstddef>
#include <iostream>
#include <map>
#include <vector>

namespace {
std::vector<std::size_t> contiguous(std::size_t threads) {
  std::vector<std::size_t> out;
  for (std::size_t t = 0; t < threads; ++t) out.push_back(t);
  return out;
}

std::vector<std::size_t> strided(std::size_t threads, std::size_t elements, std::size_t stride) {
  std::vector<std::size_t> out;
  for (std::size_t t = 0; t < threads; ++t) out.push_back((t * stride) % elements);
  return out;
}
}  // namespace

int main() {
  constexpr std::size_t threads = 6;
  constexpr std::size_t elements = 8;
  constexpr std::size_t stride = 2;

  const auto direct = contiguous(threads);
  const auto skipped = strided(threads, elements, stride);
  std::vector<int> produced(elements, 0);
  for (std::size_t t = 0; t < threads; ++t) produced[t] = static_cast<int>((t + 1) * 10 + t);

  std::map<std::size_t, std::vector<std::size_t>> readers;
  for (std::size_t t = 0; t < threads; ++t) {
    const std::size_t begin = t == 0 ? 0 : t - 1;
    const std::size_t end = t + 1 < elements ? t + 1 : elements - 1;
    for (std::size_t address = begin; address <= end; ++address) readers[address].push_back(t);
  }

  std::cout << "Patron contiguo: ";
  for (const auto address : direct) std::cout << address << ' ';
  std::cout << "\nPatron stride=2: ";
  for (const auto address : skipped) std::cout << address << ' ';
  std::cout << "\nValores reutilizados:\n";
  for (const auto& [address, users] : readers) {
    if (users.size() < 2) continue;
    std::cout << "  global[" << address << "]=" << produced[address] << " usado por ";
    for (const auto user : users) std::cout << "t" << user << ' ';
    std::cout << '\n';
  }

  std::cout << "Modelo CPU de indices logicos; no mide ni simula rendimiento GPU.\n";
  return 0;
}
