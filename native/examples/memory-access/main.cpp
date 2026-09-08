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

std::vector<std::size_t> strided(std::size_t threads, std::size_t stride) {
  std::vector<std::size_t> out;
  for (std::size_t t = 0; t < threads; ++t) out.push_back(t * stride);
  return out;
}
}  // namespace

int main() {
  constexpr std::size_t threads = 6;
  constexpr std::size_t elements = 8;
  constexpr std::size_t stride = 2;

  const auto direct = contiguous(threads);
  const auto skipped = strided(threads, stride);
  std::vector<int> produced(elements, 0);
  for (std::size_t t = 0; t < threads; ++t) produced[t] = static_cast<int>((t + 1) * 10 + t);

  std::map<std::size_t, std::vector<std::size_t>> readers;
  for (std::size_t t = 0; t < threads; ++t) {
    const std::size_t begin = t == 0 ? 0 : t - 1;
    const std::size_t end = t + 1 < threads ? t + 1 : threads - 1;
    for (std::size_t address = begin; address <= end; ++address) readers[address].push_back(t);
  }

  std::cout << "Patrón contiguo: ";
  for (const auto address : direct) std::cout << address << ' ';
  std::cout << "\nPatrón stride=2: ";
  for (const auto address : skipped) {
    std::cout << address;
    if (address >= elements) std::cout << "(fuera de rango)";
    std::cout << ' ';
  }
  std::cout << "\nValores reutilizados:\n";
  for (const auto& [address, users] : readers) {
    if (users.size() < 2) continue;
    std::cout << "  global[" << address << "]=" << produced[address] << " usado por ";
    for (const auto user : users) std::cout << "t" << user << ' ';
    std::cout << '\n';
  }

  std::cout << "Modelo CPU de índices lógicos; no mide ni simula rendimiento GPU.\n";
  return 0;
}
